package com.ccb.custodytraining.training;

import java.util.List;

import com.ccb.custodytraining.casepractice.CaseDimension;

record TrainingSnapshot(
        String caseTitle,
        String caseLine,
        List<TrainingRecordDto.DimensionResult> dimensions,
        List<String> matchedPointIds,
        List<String> missedPointIds,
        List<TrainingRecordDto.LearningSuggestion> learningSuggestions
) {
}
