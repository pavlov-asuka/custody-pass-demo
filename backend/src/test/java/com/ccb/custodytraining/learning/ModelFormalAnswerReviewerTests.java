package com.ccb.custodytraining.learning;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

import com.ccb.custodytraining.model.ModelChatClient;
import com.ccb.custodytraining.model.ModelProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ModelFormalAnswerReviewerTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JsonNode content = read("""
            {"steps":{"COMPREHENSIVE_PRACTICE":{"scenario":{"facts":["系统执行成功"]}}}}
            """);
    private final JsonNode rubric = read("""
            {
              "dimensions":[
                {"criteria":[
                  {"criterionId":"C-ONE"},
                  {"criterionId":"C-TWO"}
                ]}
              ],
              "mandatoryRequirements":[{"requirementId":"M-ONE"}],
              "referenceAnswer":"仅用于服务端评分"
            }
            """);

    @Test
    void acceptsExactlyOneStructuredDecisionForEveryServerItem() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"答案证据一"},
                  {"itemId":"C-TWO","matched":false,"evidence":"未见对应说明"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":true,"evidence":"明确先核实"}
                ]}
                """);

        FormalAnswerReviewer.Review review = reviewer(client, 0)
                .review(content, rubric, "{\"responses\":{\"result-note\":\"学员答案\"}}", "EMP-1");

        assertEquals(2, review.criteria().size());
        assertEquals(1, review.mandatoryRequirements().size());
        assertTrue(review.criteria().get(0).matched());
        assertTrue(client.userPrompts.get(0).contains("不可信待评估数据"));
        assertTrue(client.userPrompts.get(0).contains("仅用于服务端评分"));
    }

    @Test
    void rejectsUnknownDuplicateOrIncompleteItemIds() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"证据"},
                  {"itemId":"C-UNKNOWN","matched":true,"evidence":"证据"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":true,"evidence":"证据"}
                ]}
                """);

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> reviewer(client, 0).review(content, rubric, "{\"responses\":{\"result-note\":\"答案\"}}", "EMP-1"));

        assertEquals("MODEL_INVALID_DECISION", exception.getMessage());
        assertEquals(1, client.calls);
    }

    @Test
    void rejectsExtraFieldsAndFreeTextInsteadOfTrustingModelConclusion() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"证据","score":100},
                  {"itemId":"C-TWO","matched":true,"evidence":"证据"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":true,"evidence":"证据"}
                ],"conclusion":"PASSED"}
                """);

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> reviewer(client, 0).review(content, rubric, "{\"responses\":{\"result-note\":\"答案\"}}", "EMP-1"));

        assertEquals("MODEL_INVALID_SHAPE", exception.getMessage());
    }

    @Test
    void repairsMalformedOutputAtMostOnceAndRevalidatesIt() {
        StubClient client = new StubClient(
                "not-json",
                """
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"证据一"},
                  {"itemId":"C-TWO","matched":true,"evidence":"证据二"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":false,"evidence":"未见硬性要求"}
                ]}
                """);

        FormalAnswerReviewer.Review review = reviewer(client, 1)
                .review(content, rubric, "{\"responses\":{\"result-note\":\"答案\"}}", "EMP-1");

        assertEquals(2, client.calls);
        assertEquals(2, review.criteria().size());
        assertTrue(client.userPrompts.get(1).contains("只修复为规定 JSON"));
        assertTrue(client.userPrompts.get(1).contains("not-json"));
    }

    private ModelFormalAnswerReviewer reviewer(StubClient client, int repairAttempts) {
        ModelProperties properties = new ModelProperties();
        properties.setMaxRepairAttempts(repairAttempts);
        properties.setReviewTimeBudget(Duration.ofSeconds(5));
        return new ModelFormalAnswerReviewer(client, properties, objectMapper);
    }

    private JsonNode read(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static final class StubClient implements ModelChatClient {
        private final Queue<String> outputs = new ArrayDeque<>();
        private final List<String> userPrompts = new ArrayList<>();
        private int calls;

        private StubClient(String... values) {
            outputs.addAll(List.of(values));
        }

        @Override
        public String complete(String systemPrompt, String userPrompt, String callerExternalId,
                               Duration remainingBudget) {
            calls++;
            userPrompts.add(userPrompt);
            return outputs.remove();
        }
    }
}
