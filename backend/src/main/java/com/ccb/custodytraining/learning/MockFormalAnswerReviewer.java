package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.review.mode", havingValue = "mock", matchIfMissing = true)
public class MockFormalAnswerReviewer implements FormalAnswerReviewer {

    private final ObjectMapper objectMapper;

    public MockFormalAnswerReviewer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

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
        try {
            JsonNode responses = objectMapper.readTree(answer).path("responses");
            for (JsonNode rule : item.path("evidenceRules")) {
                if (!matches(responses.path(rule.path("fieldId").asText()), rule)) {
                    return new Decision(item.path(idField).asText(), false,
                            HumanFeedbackText.reviewerEvidence(item, false));
                }
            }
            return new Decision(item.path(idField).asText(), true,
                    HumanFeedbackText.reviewerEvidence(item, true));
        } catch (Exception exception) {
            return new Decision(item.path(idField).asText(), false,
                    HumanFeedbackText.unreadableSubmission());
        }
    }

    private boolean matches(JsonNode actual, JsonNode rule) {
        return switch (rule.path("operator").asText()) {
            case "EQUALS" -> actual.isValueNode()
                    && actual.asText().trim().equalsIgnoreCase(rule.path("expected").asText().trim());
            case "NUMBER_EQUALS" -> actual.isNumber()
                    && Math.abs(actual.asDouble() - rule.path("expected").asDouble())
                    <= rule.path("tolerance").asDouble(0);
            case "CONTAINS_ALL" -> {
                String value = actual.asText("").replace(",", "").replace("，", "");
                boolean matched = !value.isBlank();
                for (JsonNode expected : rule.path("expected")) {
                    matched &= value.contains(expected.asText());
                }
                yield matched;
            }
            default -> false;
        };
    }
}
