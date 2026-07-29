package com.ccb.custodytraining.learning;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class LearningRepository {

    private final JdbcTemplate jdbc;

    public LearningRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isStepComplete(long userId, String routeId, String version, String step) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM learning_step_progress
                WHERE user_id=? AND route_id=? AND content_version=? AND step_type=?
                """, Integer.class, userId, routeId, version, step);
        return count != null && count > 0;
    }

    public void completeStep(long userId, String routeId, String version, String step) {
        if (isStepComplete(userId, routeId, version, step)) {
            return;
        }
        try {
            jdbc.update("""
                    INSERT INTO learning_step_progress
                    (user_id, route_id, content_version, step_type, completed_at)
                    VALUES (?, ?, ?, ?, ?)
                    """, userId, routeId, version, step, Timestamp.from(Instant.now()));
        } catch (DuplicateKeyException ignored) {
            // 同一完成事件并发重试仍保持幂等。
        }
    }

    public boolean isQuestionCorrect(long userId, String routeId, String version, String questionId) {
        List<Boolean> values = jdbc.query("""
                SELECT correct_once FROM basic_question_progress
                WHERE user_id=? AND route_id=? AND content_version=? AND question_id=?
                """, (rs, row) -> rs.getBoolean(1), userId, routeId, version, questionId);
        return !values.isEmpty() && values.get(0);
    }

    public void recordQuestion(long userId, String routeId, String version,
                               String questionId, boolean correct) {
        List<Boolean> values = jdbc.query("""
                SELECT correct_once FROM basic_question_progress
                WHERE user_id=? AND route_id=? AND content_version=? AND question_id=?
                """, (rs, row) -> rs.getBoolean(1), userId, routeId, version, questionId);
        Instant now = Instant.now();
        if (values.isEmpty()) {
            try {
                jdbc.update("""
                        INSERT INTO basic_question_progress
                        (user_id, route_id, content_version, question_id, correct_once,
                         first_correct_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, userId, routeId, version, questionId, correct,
                        correct ? Timestamp.from(now) : null, Timestamp.from(now));
            } catch (DuplicateKeyException exception) {
                recordQuestion(userId, routeId, version, questionId, correct);
            }
            return;
        }
        if (correct && !values.get(0)) {
            jdbc.update("""
                    UPDATE basic_question_progress
                    SET correct_once=TRUE, first_correct_at=?, updated_at=?
                    WHERE user_id=? AND route_id=? AND content_version=? AND question_id=?
                    """, Timestamp.from(now), Timestamp.from(now), userId, routeId, version, questionId);
        } else {
            jdbc.update("""
                    UPDATE basic_question_progress SET updated_at=?
                    WHERE user_id=? AND route_id=? AND content_version=? AND question_id=?
                    """, Timestamp.from(now), userId, routeId, version, questionId);
        }
    }

    public int correctQuestionCount(long userId, String routeId, String version) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM basic_question_progress
                WHERE user_id=? AND route_id=? AND content_version=? AND correct_once=TRUE
                """, Integer.class, userId, routeId, version);
        return count == null ? 0 : count;
    }

    public Draft saveDraft(long userId, String routeId, String version, String answer) {
        Optional<Draft> existing = findDraft(userId, routeId);
        Instant now = Instant.now();
        if (existing.isEmpty()) {
            try {
                jdbc.update("""
                        INSERT INTO exception_case_draft
                        (user_id, route_id, content_version, answer, revision, updated_at, submitted_attempt_id)
                        VALUES (?, ?, ?, ?, 1, ?, NULL)
                        """, userId, routeId, version, answer, Timestamp.from(now));
            } catch (DuplicateKeyException exception) {
                return saveDraft(userId, routeId, version, answer);
            }
        } else {
            jdbc.update("""
                    UPDATE exception_case_draft
                    SET content_version=?, answer=?, revision=revision+1, updated_at=?, submitted_attempt_id=NULL
                    WHERE user_id=? AND route_id=?
                    """, version, answer, Timestamp.from(now), userId, routeId);
        }
        return findDraft(userId, routeId).orElseThrow();
    }

    public Optional<Draft> findDraft(long userId, String routeId) {
        return jdbc.query("""
                SELECT route_id, content_version, answer, revision, updated_at, submitted_attempt_id
                FROM exception_case_draft WHERE user_id=? AND route_id=?
                """, (rs, row) -> new Draft(
                rs.getString("route_id"), rs.getString("content_version"), rs.getString("answer"),
                rs.getLong("revision"), rs.getTimestamp("updated_at").toInstant(),
                (Long) rs.getObject("submitted_attempt_id")), userId, routeId).stream().findFirst();
    }

    public void markDraftSubmitted(long userId, String routeId, long attemptId) {
        jdbc.update("""
                UPDATE exception_case_draft SET submitted_attempt_id=?
                WHERE user_id=? AND route_id=?
                """, attemptId, userId, routeId);
    }

    public Attempt insertAttempt(long userId, String routeId, String requestId, String answer,
                                 String contentVersion, String rubricVersion,
                                 String contentSnapshot, String rubricSnapshot) {
        KeyHolder keys = new GeneratedKeyHolder();
        Instant now = Instant.now();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO formal_attempt
                    (user_id, route_id, client_request_id, answer_snapshot, content_version,
                     rubric_version, content_snapshot_json, rubric_snapshot_json,
                     processing_status, conclusion, scoring_run_count, technical_error_code,
                     submitted_at, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCORING', NULL, 0, NULL, ?, NULL)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, routeId);
            statement.setString(3, requestId);
            statement.setString(4, answer);
            statement.setString(5, contentVersion);
            statement.setString(6, rubricVersion);
            statement.setString(7, contentSnapshot);
            statement.setString(8, rubricSnapshot);
            statement.setTimestamp(9, Timestamp.from(now));
            return statement;
        }, keys);
        Number id = keys.getKey();
        if (id == null) {
            throw new IllegalStateException("正式作答写入失败");
        }
        return findAttempt(userId, id.longValue()).orElseThrow();
    }

    public Optional<Attempt> findAttemptByRequest(long userId, String requestId) {
        return queryAttempts("""
                SELECT * FROM formal_attempt WHERE user_id=? AND client_request_id=?
                """, userId, requestId).stream().findFirst();
    }

    public Optional<Attempt> findAttempt(long userId, long attemptId) {
        return queryAttempts("SELECT * FROM formal_attempt WHERE user_id=? AND id=?",
                userId, attemptId).stream().findFirst();
    }

    public Optional<Attempt> findAttempt(long attemptId) {
        return queryAttempts("SELECT * FROM formal_attempt WHERE id=?", attemptId)
                .stream().findFirst();
    }

    public Optional<Attempt> latestAttempt(long userId, String routeId) {
        List<Attempt> attempts = queryAttempts("""
                SELECT * FROM formal_attempt WHERE user_id=? AND route_id=?
                ORDER BY submitted_at DESC, id DESC LIMIT 1
                """, userId, routeId);
        return attempts.stream().findFirst();
    }

    public boolean hasPassed(long userId, String routeId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM formal_attempt
                WHERE user_id=? AND route_id=? AND processing_status='COMPLETED' AND conclusion='PASSED'
                """, Integer.class, userId, routeId);
        return count != null && count > 0;
    }

    public boolean hasLearningActivity(long userId, String routeId) {
        Integer count = jdbc.queryForObject("""
                SELECT (
                  (SELECT COUNT(*) FROM learning_step_progress WHERE user_id=? AND route_id=?) +
                  (SELECT COUNT(*) FROM basic_question_progress WHERE user_id=? AND route_id=?) +
                  (SELECT COUNT(*) FROM exception_case_draft WHERE user_id=? AND route_id=?) +
                  (SELECT COUNT(*) FROM formal_attempt WHERE user_id=? AND route_id=?)
                )
                """, Integer.class, userId, routeId, userId, routeId,
                userId, routeId, userId, routeId);
        return count != null && count > 0;
    }

    public int beginScoring(long attemptId) {
        jdbc.update("""
                UPDATE formal_attempt SET processing_status='SCORING',
                scoring_run_count=scoring_run_count+1, technical_error_code=NULL
                WHERE id=?
                """, attemptId);
        Integer count = jdbc.queryForObject(
                "SELECT scoring_run_count FROM formal_attempt WHERE id=?", Integer.class, attemptId);
        return count == null ? 0 : count;
    }

    public boolean claimFailedScoringRetry(long attemptId) {
        return jdbc.update("""
                UPDATE formal_attempt SET processing_status='SCORING',
                scoring_run_count=scoring_run_count+1, technical_error_code=NULL
                WHERE id=? AND processing_status='FAILED'
                """, attemptId) == 1;
    }

    public void completeScoring(long attemptId, int totalScore, String conclusion, String resultJson) {
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO scoring_result (attempt_id, total_score, result_snapshot_json, created_at)
                VALUES (?, ?, ?, ?)
                """, attemptId, totalScore, resultJson, Timestamp.from(now));
        jdbc.update("""
                UPDATE formal_attempt SET processing_status='COMPLETED', conclusion=?,
                completed_at=?, technical_error_code=NULL WHERE id=?
                """, conclusion, Timestamp.from(now), attemptId);
    }

    public void failScoring(long attemptId, String errorCode) {
        jdbc.update("""
                UPDATE formal_attempt SET processing_status='FAILED', technical_error_code=?,
                completed_at=NULL WHERE id=?
                """, errorCode, attemptId);
    }

    public Optional<ResultSnapshot> result(long attemptId) {
        return jdbc.query("""
                SELECT total_score, result_snapshot_json, created_at
                FROM scoring_result WHERE attempt_id=?
                """, (rs, row) -> new ResultSnapshot(
                rs.getInt("total_score"), rs.getString("result_snapshot_json"),
                rs.getTimestamp("created_at").toInstant()), attemptId).stream().findFirst();
    }

    public long createRemediationPlan(long attemptId, long userId, String routeId,
                                      List<TargetSnapshot> targets) {
        KeyHolder keys = new GeneratedKeyHolder();
        Instant now = Instant.now();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO remediation_plan
                    (attempt_id, user_id, route_id, active, completed_at, created_at)
                    VALUES (?, ?, ?, TRUE, NULL, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, attemptId);
            statement.setLong(2, userId);
            statement.setString(3, routeId);
            statement.setTimestamp(4, Timestamp.from(now));
            return statement;
        }, keys);
        long planId = keys.getKey().longValue();
        for (TargetSnapshot target : targets) {
            jdbc.update("""
                    INSERT INTO remediation_target
                    (plan_id, target_id, target_snapshot_json, completed, completed_at)
                    VALUES (?, ?, ?, FALSE, NULL)
                    """, planId, target.targetId(), target.snapshotJson());
        }
        jdbc.update("""
                UPDATE remediation_plan SET active=FALSE
                WHERE user_id=? AND route_id=? AND id<>? AND active=TRUE
                """, userId, routeId, planId);
        return planId;
    }

    public Optional<Plan> planByAttempt(long userId, long attemptId) {
        List<Plan> plans = jdbc.query("""
                SELECT id, attempt_id, user_id, route_id, active, completed_at, created_at
                FROM remediation_plan WHERE user_id=? AND attempt_id=?
                """, (rs, row) -> new Plan(
                rs.getLong("id"), rs.getLong("attempt_id"), rs.getLong("user_id"),
                rs.getString("route_id"), rs.getBoolean("active"),
                instant(rs.getTimestamp("completed_at")), rs.getTimestamp("created_at").toInstant()),
                userId, attemptId);
        return plans.stream().findFirst();
    }

    public List<Target> targets(long planId) {
        return jdbc.query("""
                SELECT target_id, target_snapshot_json, completed, completed_at
                FROM remediation_target WHERE plan_id=? ORDER BY id
                """, (rs, row) -> new Target(
                rs.getString("target_id"), rs.getString("target_snapshot_json"),
                rs.getBoolean("completed"), instant(rs.getTimestamp("completed_at"))), planId);
    }

    public void completeTarget(long planId, String targetId) {
        Instant now = Instant.now();
        jdbc.update("""
                UPDATE remediation_target SET completed=TRUE, completed_at=?
                WHERE plan_id=? AND target_id=?
                """, Timestamp.from(now), planId, targetId);
        Integer remaining = jdbc.queryForObject("""
                SELECT COUNT(*) FROM remediation_target WHERE plan_id=? AND completed=FALSE
                """, Integer.class, planId);
        if (remaining != null && remaining == 0) {
            jdbc.update("UPDATE remediation_plan SET completed_at=? WHERE id=?",
                    Timestamp.from(now), planId);
        }
    }

    public boolean planComplete(long planId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM remediation_target WHERE plan_id=? AND completed=FALSE
                """, Integer.class, planId);
        return count != null && count == 0;
    }

    public RecordPage attempts(long userId, String line, String conclusion, int size, int offset) {
        StringBuilder where = new StringBuilder(" WHERE user_id=?");
        java.util.ArrayList<Object> parameters = new java.util.ArrayList<>();
        parameters.add(userId);
        if (line != null) {
            where.append(" AND route_id LIKE ?");
            parameters.add(line.equals("ACCOUNTING") ? "ACC-%" : line + "-%");
        }
        if (conclusion != null) {
            where.append(" AND conclusion=?");
            parameters.add(conclusion);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM formal_attempt" + where,
                Long.class, parameters.toArray());
        parameters.add(size);
        parameters.add(offset);
        List<Attempt> items = queryAttempts("SELECT * FROM formal_attempt" + where
                + " ORDER BY submitted_at DESC, id DESC LIMIT ? OFFSET ?", parameters.toArray());
        return new RecordPage(items, total == null ? 0 : total);
    }

    private List<Attempt> queryAttempts(String sql, Object... parameters) {
        return jdbc.query(sql, (rs, row) -> new Attempt(
                rs.getLong("id"), rs.getLong("user_id"), rs.getString("route_id"),
                rs.getString("client_request_id"), rs.getString("answer_snapshot"),
                rs.getString("content_version"), rs.getString("rubric_version"),
                rs.getString("content_snapshot_json"), rs.getString("rubric_snapshot_json"),
                rs.getString("processing_status"), rs.getString("conclusion"),
                rs.getInt("scoring_run_count"), rs.getString("technical_error_code"),
                rs.getTimestamp("submitted_at").toInstant(),
                instant(rs.getTimestamp("completed_at"))), parameters);
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record Draft(String routeId, String contentVersion, String answer,
                        long revision, Instant updatedAt, Long submittedAttemptId) {
    }

    public record Attempt(long id, long userId, String routeId, String clientRequestId,
                          String answer, String contentVersion, String rubricVersion,
                          String contentSnapshotJson, String rubricSnapshotJson,
                          String processingStatus, String conclusion, int scoringRunCount,
                          String technicalErrorCode, Instant submittedAt, Instant completedAt) {
    }

    public record ResultSnapshot(int totalScore, String json, Instant createdAt) {
    }

    public record TargetSnapshot(String targetId, String snapshotJson) {
    }

    public record Plan(long id, long attemptId, long userId, String routeId,
                       boolean active, Instant completedAt, Instant createdAt) {
    }

    public record Target(String targetId, String snapshotJson,
                         boolean completed, Instant completedAt) {
    }

    public record RecordPage(List<Attempt> items, long total) {
    }
}
