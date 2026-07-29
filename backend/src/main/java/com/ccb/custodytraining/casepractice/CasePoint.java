package com.ccb.custodytraining.casepractice;

import java.util.List;

public record CasePoint(
        String pointId,
        String description,
        int weight,
        List<String> keywords,
        List<String> knowledgeTopicIds
) {
}
