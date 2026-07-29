package com.ccb.custodytraining.training;

import java.time.Instant;

public record TrainingRecord(
        Long id,
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
) {
}
