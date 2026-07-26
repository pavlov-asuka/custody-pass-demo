package com.ccb.custodytraining.casepractice;

import java.util.List;
import java.util.Map;

public record CaseAsset(
        String id,
        String version,
        String rubricVersion,
        boolean placeholder,
        CaseLine line,
        String title,
        String summary,
        String background,
        List<String> tasks,
        String difficulty,
        int estimatedMinutes,
        String referenceAnswer,
        Map<CaseDimension, CaseDimensionAsset> dimensions
) {
}
