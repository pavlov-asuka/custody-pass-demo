package com.ccb.custodytraining.training;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class TrainingRecordRepository {

    private final JdbcTemplate jdbcTemplate;

    public TrainingRecordRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<TrainingRecord> findByUserAndClientRequestId(Long userId, String clientRequestId) {
        List<TrainingRecord> records = jdbcTemplate.query(
                "SELECT id, user_id, case_id, case_version, rubric_version, client_request_id, "
                        + "answer, total_score, reviewer_mode, snapshot_json, created_at "
                        + "FROM training_record WHERE user_id = ? AND client_request_id = ?",
                this::mapRecord, userId, clientRequestId);
        return records.stream().findFirst();
    }

    public Optional<TrainingRecord> findByUserAndId(Long userId, Long recordId) {
        List<TrainingRecord> records = jdbcTemplate.query(
                "SELECT id, user_id, case_id, case_version, rubric_version, client_request_id, "
                        + "answer, total_score, reviewer_mode, snapshot_json, created_at "
                        + "FROM training_record WHERE user_id = ? AND id = ?",
                this::mapRecord, userId, recordId);
        return records.stream().findFirst();
    }

    public List<TrainingRecord> findPageByUser(Long userId, int size, int offset) {
        return jdbcTemplate.query(
                "SELECT id, user_id, case_id, case_version, rubric_version, client_request_id, "
                        + "answer, total_score, reviewer_mode, snapshot_json, created_at "
                        + "FROM training_record WHERE user_id = ? "
                        + "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
                this::mapRecord, userId, size, offset);
    }

    public long countByUser(Long userId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM training_record WHERE user_id = ?", Long.class, userId);
        return count == null ? 0L : count;
    }

    public TrainingRecord insert(
            Long userId,
            String caseId,
            String caseVersion,
            String rubricVersion,
            String clientRequestId,
            String answer,
            int totalScore,
            String reviewerMode,
            String snapshotJson,
            Instant createdAt
    ) throws DataAccessException {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    "INSERT INTO training_record "
                            + "(user_id, case_id, case_version, rubric_version, client_request_id, "
                            + "answer, total_score, reviewer_mode, snapshot_json, created_at) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    new String[] {"id"});
            statement.setLong(1, userId);
            statement.setString(2, caseId);
            statement.setString(3, caseVersion);
            statement.setString(4, rubricVersion);
            statement.setString(5, clientRequestId);
            statement.setString(6, answer);
            statement.setInt(7, totalScore);
            statement.setString(8, reviewerMode);
            statement.setString(9, snapshotJson);
            statement.setTimestamp(10, Timestamp.from(createdAt));
            return statement;
        }, keyHolder);
        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("训练记录写入后无法获取记录编号");
        }
        return findByUserAndId(userId, generatedId.longValue())
                .orElseThrow(() -> new IllegalStateException("训练记录写入后无法读取记录"));
    }

    private TrainingRecord mapRecord(ResultSet resultSet, int rowNumber) throws SQLException {
        Timestamp createdAt = resultSet.getTimestamp("created_at");
        return new TrainingRecord(
                resultSet.getLong("id"),
                resultSet.getLong("user_id"),
                resultSet.getString("case_id"),
                resultSet.getString("case_version"),
                resultSet.getString("rubric_version"),
                resultSet.getString("client_request_id"),
                resultSet.getString("answer"),
                resultSet.getInt("total_score"),
                resultSet.getString("reviewer_mode"),
                resultSet.getString("snapshot_json"),
                createdAt == null ? null : createdAt.toInstant());
    }
}
