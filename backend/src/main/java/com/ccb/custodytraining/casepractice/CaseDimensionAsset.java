package com.ccb.custodytraining.casepractice;

import java.util.List;

public record CaseDimensionAsset(
        CaseDimension dimension,
        int maxScore,
        List<CasePoint> points
) {
}
