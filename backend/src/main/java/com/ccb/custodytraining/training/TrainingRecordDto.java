package com.ccb.custodytraining.training;

import java.time.Instant;
import java.util.List;

import com.ccb.custodytraining.casepractice.CaseDimension;

public final class TrainingRecordDto {

    private TrainingRecordDto() {
    }

    public record PointResult(
            String pointId,
            String description,
            int weight,
            boolean matched,
            String evidence
    ) {
    }

    public record DimensionResult(
            CaseDimension dimension,
            int score,
            int maxScore,
            List<PointResult> points
    ) {
    }

    public record Detail(
            Long recordId,
            String caseId,
            String caseVersion,
            String rubricVersion,
            String caseTitle,
            String caseLine,
            String answer,
            Instant submittedAt,
            String reviewerMode,
            int totalScore,
            int totalMaxScore,
            List<DimensionResult> dimensions,
            List<String> matchedPointIds,
            List<String> missedPointIds,
            List<LearningSuggestion> learningSuggestions
    ) {
    }

    public record LearningSuggestion(String knowledgeTopicId, String text) {
    }

    public record Summary(
            Long recordId,
            String caseId,
            String caseTitle,
            String caseLine,
            int totalScore,
            int totalMaxScore,
            String reviewerMode,
            Instant submittedAt
    ) {
    }

    public record Page(
            List<Summary> items,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }
}
