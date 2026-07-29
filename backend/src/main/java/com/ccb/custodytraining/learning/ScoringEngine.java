package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.learning.LearningTypes.Conclusion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class ScoringEngine {

    private final ObjectMapper objectMapper;

    public ScoringEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Outcome calculate(JsonNode rubric, FormalAnswerReviewer.Review review) {
        Map<String, FormalAnswerReviewer.Decision> criteria = index(review.criteria());
        Map<String, FormalAnswerReviewer.Decision> mandatory = index(review.mandatoryRequirements());
        ObjectNode result = objectMapper.createObjectNode();
        int total = 0;
        Set<String> remediationTargetIds = new LinkedHashSet<>();
        ArrayNode dimensionResults = result.putArray("dimensions");
        for (JsonNode dimension : rubric.path("dimensions")) {
            ObjectNode dimensionResult = dimensionResults.addObject();
            dimensionResult.put("dimension", dimension.path("dimension").asText());
            dimensionResult.put("maxScore", dimension.path("maxScore").asInt());
            int score = 0;
            ArrayNode items = dimensionResult.putArray("items");
            for (JsonNode criterion : dimension.path("criteria")) {
                String id = criterion.path("criterionId").asText();
                FormalAnswerReviewer.Decision decision = required(criteria, id);
                int weight = criterion.path("weight").asInt();
                if (decision.matched()) {
                    score += weight;
                } else {
                    remediationTargetIds.add(criterion.path("remediationTargetId").asText());
                }
                items.addObject()
                        .put("itemId", id)
                        .put("description", criterion.path("description").asText())
                        .put("matched", decision.matched())
                        .put("evidence", decision.evidence());
            }
            dimensionResult.put("score", score);
            total += score;
        }
        ArrayNode mandatoryResults = result.putArray("mandatoryRequirements");
        boolean allMandatory = true;
        for (JsonNode requirement : rubric.path("mandatoryRequirements")) {
            String id = requirement.path("requirementId").asText();
            FormalAnswerReviewer.Decision decision = required(mandatory, id);
            allMandatory &= decision.matched();
            if (!decision.matched()) {
                remediationTargetIds.add(requirement.path("remediationTargetId").asText());
            }
            mandatoryResults.addObject()
                    .put("requirementId", id)
                    .put("description", requirement.path("description").asText())
                    .put("met", decision.matched())
                    .put("evidence", decision.evidence());
        }
        int passScore = rubric.path("passScore").asInt();
        Conclusion conclusion = total >= passScore && allMandatory
                ? Conclusion.PASSED : Conclusion.LEARNED_NOT_MASTERED;
        result.put("totalScore", total);
        result.put("passScore", passScore);
        result.put("conclusion", conclusion.name());
        result.put("scoreThresholdMet", total >= passScore);
        result.put("allMandatoryRequirementsMet", allMandatory);
        return new Outcome(total, conclusion, result, List.copyOf(remediationTargetIds));
    }

    private Map<String, FormalAnswerReviewer.Decision> index(
            List<FormalAnswerReviewer.Decision> decisions) {
        Map<String, FormalAnswerReviewer.Decision> result = new HashMap<>();
        for (FormalAnswerReviewer.Decision decision : decisions) {
            if (result.put(decision.itemId(), decision) != null) {
                throw new IllegalStateException("评分结果包含重复项目");
            }
        }
        return result;
    }

    private FormalAnswerReviewer.Decision required(
            Map<String, FormalAnswerReviewer.Decision> decisions, String id) {
        FormalAnswerReviewer.Decision decision = decisions.get(id);
        if (decision == null) {
            throw new IllegalStateException("评分结果缺少项目 " + id);
        }
        return decision;
    }

    public record Outcome(int totalScore, Conclusion conclusion,
                          ObjectNode result, List<String> remediationTargetIds) {
    }
}
