package com.ccb.custodytraining.casepractice;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.review.mode", havingValue = "mock", matchIfMissing = true)
public class MockRuleCaseReviewer implements CaseReviewer {

    @Override
    public String reviewerMode() {
        return "MOCK_RULES";
    }

    @Override
    public ReviewDraft review(CaseAsset asset, String answer, String callerExternalId) {
        List<PointDecision> decisions = new ArrayList<>();
        for (CaseDimension dimension : CaseDimension.values()) {
            for (CasePoint point : asset.dimensions().get(dimension).points()) {
                String matchedKeyword = point.keywords().stream()
                        .filter(answer::contains)
                        .findFirst()
                        .orElse(null);
                boolean matched = matchedKeyword != null;
                String evidence = matched
                        ? "答案包含关键词：" + matchedKeyword
                        : "答案未出现该得分点的预设关键词";
                decisions.add(new PointDecision(point.pointId(), matched, evidence));
            }
        }
        return new ReviewDraft(List.copyOf(decisions));
    }
}
