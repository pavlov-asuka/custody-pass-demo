package com.ccb.custodytraining.casepractice;

import java.util.List;

public interface CaseReviewer {

    String reviewerMode();

    ReviewDraft review(CaseAsset asset, String answer, String callerExternalId);

    record ReviewDraft(List<PointDecision> pointDecisions) {
    }

    record PointDecision(String pointId, boolean matched, String evidence) {
    }
}
