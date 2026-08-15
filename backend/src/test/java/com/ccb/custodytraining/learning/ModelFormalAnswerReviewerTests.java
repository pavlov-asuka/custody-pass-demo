package com.ccb.custodytraining.learning;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
                  {"criterionId":"C-ONE","description":"成交金额字段和来源","evidenceRequirement":"成交金额来源已核对"},
                  {"criterionId":"C-TWO","description":"跨来源勾稽结论","evidenceRequirement":"勾稽结论已核对"}
                ]}
              ],
              "mandatoryRequirements":[{"requirementId":"M-ONE","description":"业务状态字段","evidenceRequirement":"业务状态已核对"}],
              "referenceAnswer":"仅用于服务端评分"
            }
            """);

    @Test
    void acceptsExactlyOneStructuredDecisionForEveryServerItem() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"成交金额字段已从资料核对"},
                  {"itemId":"C-TWO","matched":false,"evidence":"跨来源勾稽结论还对不上资料"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":true,"evidence":"业务状态字段已核对"}
                ]}
                """);

        FormalAnswerReviewer.Review review = reviewer(client, 0)
                .review(content, rubric, "{\"responses\":{\"result-note\":\"学员答案\"}}", "EMP-1");

        assertEquals(2, review.criteria().size());
        assertEquals(1, review.mandatoryRequirements().size());
        assertTrue(review.criteria().get(0).matched());
        assertEquals("成交金额字段已从资料核对", review.criteria().get(0).evidence());
        assertTrue(client.userPrompts.get(0).contains("不可信待评估数据"));
        assertTrue(client.userPrompts.get(0).contains("仅用于服务端评分"));
        assertTrue(client.userPrompts.get(0).contains("学员可读的业务核对说明"));
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

    @Test
    void replacesEvaluatorJargonWithConcreteBusinessFallback() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"能力已体现"},
                  {"itemId":"C-TWO","matched":false,"evidence":"结构化作答未满足"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":false,"evidence":"未见对应说明"}
                ]}
                """);

        FormalAnswerReviewer.Review review = reviewer(client, 0)
                .review(content, rubric, "{\"responses\":{\"result-note\":\"答案\"}}", "EMP-1");

        assertTrue(review.criteria().get(0).evidence().contains("成交金额字段"));
        assertTrue(review.criteria().get(1).evidence().contains("跨来源勾稽结论"));
        assertTrue(review.mandatoryRequirements().get(0).evidence().contains("业务状态字段"));
        assertFalse(review.criteria().get(0).evidence().contains("能力已体现"));
        assertFalse(review.criteria().get(1).evidence().contains("结构化作答"));
    }

    @Test
    void translatesInternalBusinessStateBeforePublishingEvidence() {
        StubClient client = new StubClient("""
                {"criteria":[
                  {"itemId":"C-ONE","matched":true,"evidence":"资料中的 SHARES_POSTED 状态已核对"},
                  {"itemId":"C-TWO","matched":true,"evidence":"勾稽结论已从资料核对"}
                ],"mandatoryRequirements":[
                  {"itemId":"M-ONE","matched":true,"evidence":"业务状态字段已核对"}
                ]}
                """);

        FormalAnswerReviewer.Review review = reviewer(client, 0)
                .review(content, rubric, "{\"responses\":{\"result-note\":\"答案\"}}", "EMP-1");

        assertTrue(review.criteria().get(0).evidence().contains("份额已登记"));
        assertFalse(review.criteria().get(0).evidence().contains("SHARES_POSTED"));
    }

    @Test
    void translatesEmbeddedTechnicalLabelsInPracticeFeedback() {
        JsonNode question = read("""
                {"type":"CALCULATION","explanation":"gross255600.00、commission281.16、settlement255881.16，DATA_STATE 已核对"}
                """);

        String explanation = HumanFeedbackText.correctPracticeExplanation(question);

        assertTrue(explanation.contains("成交毛额255600.00"));
        assertTrue(explanation.contains("佣金281.16"));
        assertTrue(explanation.contains("交收金额255881.16"));
        assertTrue(explanation.contains("资料·状态"));
        assertFalse(explanation.contains("gross"));
        assertFalse(explanation.contains("DATA_STATE"));
    }

    @Test
    void keepsBusinessActionsWhileRemovingTechnicalLabels() {
        JsonNode target = read("""
                {"title":"完成申购付款资金清算","reason":"复算 gross、commission、settlement 和 reserveClose"}
                """);

        assertEquals("完成申购付款资金清算", HumanFeedbackText.remediationTitle(target));
        String reason = HumanFeedbackText.remediationReason(target);
        assertTrue(reason.contains("成交毛额"));
        assertTrue(reason.contains("佣金"));
        assertTrue(reason.contains("交收金额"));
        assertTrue(reason.contains("期末备付金"));
    }

    @Test
    void translatesCamelCaseCodesActionsAndSourceIdentifiersWithoutCollapsingMeaning() {
        JsonNode question = read("""
                {"type":"CALCULATION","explanation":"recordCount、parsedRows、parseStatus=PASS；FOF01-B-CASH→actualCash；CASE-ED-B1-XBRL-01；RETURN_TO_AP、IN_KIND"}
                """);

        String explanation = HumanFeedbackText.correctPracticeExplanation(question);

        assertTrue(explanation.contains("记录条数"));
        assertTrue(explanation.contains("已解析行数"));
        assertTrue(explanation.contains("解析状态=校验通过"));
        assertTrue(explanation.contains("资金资料标识→实际到账资金"));
        assertTrue(explanation.contains("XBRL 资料标识 01"));
        assertTrue(explanation.contains("退回申赎参与人"));
        assertTrue(explanation.contains("实物交付"));
        assertFalse(explanation.contains("recordCount"));
        assertFalse(explanation.contains("业务状态"));
    }

    @Test
    void remediationKeepsCashAndShareDifferencesDistinct() {
        JsonNode target = read("""
                {"title":"补学confirmedShares计算","reason":"重新核对cashDiff与sharesDiff"}
                """);

        assertEquals("确认份额计算", HumanFeedbackText.remediationTitle(target));
        String reason = HumanFeedbackText.remediationReason(target);
        assertTrue(reason.contains("资金差额"));
        assertTrue(reason.contains("份额差额"));
        assertFalse(reason.contains("差额字段"));
    }

    @Test
    void unknownCamelCaseNeverLeaksThroughPublicEvidence() {
        String evidence = HumanFeedbackText.publicEvidence(
                "资料来源和计算关系", "资料中的 customMetricField 已核对", true);

        assertFalse(evidence.contains("customMetricField"));
        assertTrue(evidence.contains("业务字段") || evidence.contains("资料来源"));
    }

    @Test
    void keepsFormulaAndMixedCaseBusinessTermsSpecific() {
        JsonNode question = read("""
                {"type":"RECONCILIATION","explanation":"SHARES_POSTED、MAPPED；reserve现金链；reserveOpen、formulaDiff、TAShares、TAClosingShares、calculatedMarketValue、IRR 已核对"}
                """);

        String explanation = HumanFeedbackText.correctPracticeExplanation(question);

        assertTrue(explanation.contains("份额已登记"));
        assertTrue(explanation.contains("来源已对应"));
        assertTrue(explanation.contains("备付金现金链"));
        assertTrue(explanation.contains("期初备付金"));
        assertTrue(explanation.contains("公式差额"));
        assertTrue(explanation.contains("TA 份额"));
        assertTrue(explanation.contains("TA 期末份额"));
        assertTrue(explanation.contains("计算市值"));
        assertTrue(explanation.contains("IRR"));
        assertFalse(explanation.contains("业务资料标识"));
        assertFalse(explanation.contains("业务字段"));
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
