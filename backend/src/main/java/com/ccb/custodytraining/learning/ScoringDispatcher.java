package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScoringDispatcher {

    private final LearningRepository repository;
    private final FormalAnswerReviewer reviewer;
    private final ScoringEngine scoringEngine;
    private final ObjectMapper objectMapper;

    public ScoringDispatcher(LearningRepository repository, FormalAnswerReviewer reviewer,
                             ScoringEngine scoringEngine, ObjectMapper objectMapper) {
        this.repository = repository;
        this.reviewer = reviewer;
        this.scoringEngine = scoringEngine;
        this.objectMapper = objectMapper;
    }

    @Async("scoringExecutor")
    @Transactional
    public void score(long attemptId, String callerExternalId) {
        LearningRepository.Attempt attempt = repository.findAttempt(attemptId).orElse(null);
        if (attempt == null || repository.result(attemptId).isPresent()) {
            return;
        }
        int run = attempt.scoringRunCount() == 0
                ? repository.beginScoring(attemptId) : attempt.scoringRunCount();
        try {
            if (attempt.answer().contains("[SCORING_FAIL_ONCE]") && run == 1) {
                throw new IllegalStateException("SIMULATED_TRANSIENT_FAILURE");
            }
            JsonNode content = objectMapper.readTree(attempt.contentSnapshotJson());
            JsonNode rubric = objectMapper.readTree(attempt.rubricSnapshotJson());
            FormalAnswerReviewer.Review review = reviewer.review(
                    content, rubric, attempt.answer(), callerExternalId);
            ScoringEngine.Outcome outcome = scoringEngine.calculate(rubric, review);
            repository.completeScoring(attemptId, outcome.totalScore(),
                    outcome.conclusion().name(), objectMapper.writeValueAsString(outcome.result()));
            if (outcome.conclusion() == LearningTypes.Conclusion.LEARNED_NOT_MASTERED) {
                List<LearningRepository.TargetSnapshot> targets = new ArrayList<>();
                for (String targetId : outcome.remediationTargetIds()) {
                    JsonNode target = findTarget(rubric, targetId);
                    targets.add(new LearningRepository.TargetSnapshot(
                            targetId, objectMapper.writeValueAsString(target)));
                }
                repository.createRemediationPlan(attemptId, attempt.userId(),
                        attempt.routeId(), targets);
            }
        } catch (Exception exception) {
            repository.failScoring(attemptId, classify(exception));
        }
    }

    private JsonNode findTarget(JsonNode rubric, String targetId) {
        for (JsonNode target : rubric.path("remediationTargets")) {
            if (targetId.equals(target.path("targetId").asText())) {
                return target;
            }
        }
        throw new IllegalStateException("补学目标引用无效");
    }

    private String classify(Exception exception) {
        String message = exception.getMessage();
        if (message != null && message.startsWith("MODEL_")) {
            return "MODEL_OUTPUT_INVALID";
        }
        if ("SIMULATED_TRANSIENT_FAILURE".equals(message)) {
            return "SCORING_TEMPORARILY_UNAVAILABLE";
        }
        return "SCORING_EXECUTION_FAILED";
    }
}
