package com.ccb.custodytraining.learning;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

public interface FormalAnswerReviewer {

    Review review(JsonNode content, JsonNode rubric, String answer, String callerExternalId);

    record Decision(String itemId, boolean matched, String evidence) {
    }

    record Review(List<Decision> criteria, List<Decision> mandatoryRequirements) {
    }
}
