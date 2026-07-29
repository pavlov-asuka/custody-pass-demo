package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.review.mode", havingValue = "mock", matchIfMissing = true)
public class MockFormalAnswerReviewer implements FormalAnswerReviewer {

    @Override
    public Review review(JsonNode content, JsonNode rubric, String answer, String callerExternalId) {
        List<Decision> criteria = new ArrayList<>();
        for (JsonNode dimension : rubric.path("dimensions")) {
            for (JsonNode criterion : dimension.path("criteria")) {
                criteria.add(decide(criterion, "criterionId", answer));
            }
        }
        List<Decision> mandatory = new ArrayList<>();
        for (JsonNode requirement : rubric.path("mandatoryRequirements")) {
            mandatory.add(decide(requirement, "requirementId", answer));
        }
        return new Review(List.copyOf(criteria), List.copyOf(mandatory));
    }

    private Decision decide(JsonNode item, String idField, String answer) {
        String matchedKeyword = null;
        for (JsonNode keyword : item.path("keywords")) {
            if (answer.contains(keyword.asText())) {
                matchedKeyword = keyword.asText();
                break;
            }
        }
        boolean matched = matchedKeyword != null;
        String evidence = matched
                ? "学员答案包含可追溯证据：“" + matchedKeyword + "”"
                : "学员答案未提供满足该要求的明确证据";
        return new Decision(item.path(idField).asText(), matched, evidence);
    }
}
