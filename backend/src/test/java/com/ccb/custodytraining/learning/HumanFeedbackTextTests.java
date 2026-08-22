package com.ccb.custodytraining.learning;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

class HumanFeedbackTextTests {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void learnerFeedbackTranslatesMixedAndStandaloneInternalLabels() {
        ObjectNode target = objectMapper.createObjectNode();
        target.put("reason", "内部 closing shares 读取或登记错误");
        assertEquals("内部期末份额 读取或登记错误", HumanFeedbackText.remediationReason(target));

        String evidence = HumanFeedbackText.publicEvidence(
                "归档证据",
                "archiveId/status 已与资料核对",
                true);
        assertTrue(evidence.contains("归档记录/状态"));
        assertFalse(evidence.contains("archiveId"));
        assertFalse(evidence.contains("/status"));
    }

    @Test
    void clearingLedgerPracticeUsesBusinessResultRegistrationHint() {
        ObjectNode question = objectMapper.createObjectNode();
        question.put("questionId", "CLR-FUND-PAYMENT-Q-03");
        question.put("type", "LEDGER_ENTRY");
        question.putArray("hints").add("结果登记看执行确认和资金账资料，不用业务依据代替执行结果。");

        String hint = HumanFeedbackText.practiceHint(question);
        String explanation = HumanFeedbackText.incorrectPracticeExplanation(question);

        assertEquals(hint, explanation);
        assertTrue(hint.contains("执行确认") && hint.contains("资金账"));
        assertFalse(hint.contains("借贷方向"));
        assertFalse(hint.contains("科目"));
        assertFalse(hint.contains("成本"));
        assertFalse(hint.contains("清算款"));
    }

    @Test
    void clearingReviewerRejectsAccountingTemplateAndUsesConcreteBusinessFocus() {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("criterionId", "C-CLR-FUND-PAYMENT-RESULT-LEDGER");
        item.put("description", "把正常执行结果和资金账支付变动登记回同一业务键");
        item.put("evidenceRequirement", "结果登记保留业务键、支付金额、执行状态和入账状态");

        String evidence = HumanFeedbackText.normalizeModelEvidence(
                "按借贷方向逐行核对科目；成本、费用、应付项和清算款分别登记。",
                item, false, objectMapper.createObjectNode(), objectMapper.createObjectNode());

        assertTrue(evidence.contains("业务键") || evidence.contains("资金账"));
        assertFalse(evidence.contains("借贷方向"));
        assertFalse(evidence.contains("科目"));
        assertFalse(evidence.contains("成本"));
        assertFalse(evidence.contains("费用"));
        assertFalse(evidence.contains("应付项"));
        assertFalse(evidence.contains("清算款"));
    }

    @Test
    void clearingStatesAreDisplayedAsBusinessStatus() {
        ObjectNode question = objectMapper.createObjectNode();
        question.put("questionId", "CLR-IB-DVP-Q-03");
        question.put("type", "LEDGER_ENTRY");
        question.put("explanation", "DVP_SETTLED / EOD_CLOSED；执行状态 EXECUTED，报表 SENT，结果 POSTED。");

        String explanation = HumanFeedbackText.correctPracticeExplanation(question);

        assertTrue(explanation.contains("DVP已结算"));
        assertTrue(explanation.contains("日终已关闭"));
        assertTrue(explanation.contains("已执行"));
        assertTrue(explanation.contains("已发送"));
        assertTrue(explanation.contains("已登记"));
        assertFalse(explanation.contains("DVP_SETTLED"));
        assertFalse(explanation.contains("EOD_CLOSED"));
    }

    @Test
    void clearingCalculationUsesBusinessUnitsInsteadOfUnknownCodeFallback() {
        ObjectNode question = objectMapper.createObjectNode();
        question.put("questionId", "CLR-BASE-Q-02");
        question.put("type", "CALCULATION");
        question.put("explanation", "12×200=2400 unit；7250.00+11500.00=18750.00 CNY。");

        String hint = HumanFeedbackText.practiceHint(question);
        String explanation = HumanFeedbackText.correctPracticeExplanation(question);

        assertEquals("先从资料读取数量和金额，再按资料中的计算关系复算并保留单位。", hint);
        assertTrue(explanation.contains("2400 单位"));
        assertTrue(explanation.contains("18750.00 元"));
        assertFalse(explanation.contains("业务资料标识"));
        assertFalse(explanation.contains("业务字段"));
        assertFalse(hint.contains("本案例"));
    }

    @Test
    void clearingCodedFallbackKeepsClearingContext() {
        String evidence = HumanFeedbackText.publicEvidence(
                "C-CLR-BASE-RESULT",
                "",
                "UNKNOWN_CODE unknownField",
                true);

        assertTrue(evidence.contains("清算业务键"));
        assertTrue(evidence.contains("清算资料字段"));
        assertFalse(evidence.contains("本案例脱敏键"));
        assertFalse(evidence.contains("本案例资料字段"));
    }

    @Test
    void clearingFeedbackNeverLeaksCourseMetaLanguage() {
        ObjectNode question = objectMapper.createObjectNode();
        question.put("questionId", "CLR-BASE-Q-02");
        question.put("type", "CALCULATION");
        question.put("prompt", "题面要求核对本案例、本路线的可追溯结构化作答");
        question.put("explanation", "本案例资料完整；本路线结果可追溯，结构化作答已完成。");
        question.putArray("hints").add("回到题面核对本案例、本路线和可追溯的结构化作答。");

        ObjectNode target = objectMapper.createObjectNode();
        target.put("targetId", "CLR-BASE-REMEDIATION");
        target.put("title", "本路线题面可追溯结果");
        target.put("reason", "本案例的结构化作答还没有和资料对上。");

        ObjectNode item = objectMapper.createObjectNode();
        item.put("criterionId", "C-CLR-BASE-RESULT");
        item.put("description", "本案例题面中的本路线资料结果");
        item.put("evidenceRequirement", "可追溯的结构化作答应回到资料核对");

        assertNoCourseMetaLanguage(HumanFeedbackText.practiceHint(question));
        assertNoCourseMetaLanguage(HumanFeedbackText.incorrectPracticeExplanation(question));
        assertNoCourseMetaLanguage(HumanFeedbackText.correctPracticeExplanation(question));
        assertNoCourseMetaLanguage(HumanFeedbackText.remediationTitle(target));
        assertNoCourseMetaLanguage(HumanFeedbackText.remediationReason(target));
        assertNoCourseMetaLanguage(HumanFeedbackText.normalizeModelEvidence(
                "本案例本路线题面可追溯结构化作答已完成资料核对。",
                item, false, objectMapper.createObjectNode(), objectMapper.createObjectNode()));
        assertNoCourseMetaLanguage(HumanFeedbackText.publicEvidence(
                "C-CLR-BASE-RESULT",
                item.path("description").asText(),
                "本案例本路线题面可追溯结构化作答已完成资料核对。",
                false));
    }

    @Test
    void publicEvidenceUsesStableItemIdForClearingFinalGuard() {
        String evidence = HumanFeedbackText.publicEvidence(
                "C-CLR-BASE-RESULT",
                "结果登记",
                "按借贷方向逐行核对科目；成本、费用、应付项和清算款分别登记。",
                false);

        assertTrue(evidence.contains("清算资料"));
        assertTrue(evidence.contains("结果登记"));
        assertFalse(evidence.contains("借贷方向"));
        assertFalse(evidence.contains("科目；成本"));
        assertFalse(evidence.contains("业务资料标识"));
        assertFalse(evidence.contains("业务字段"));
    }

    @Test
    void accountingFeedbackAndLegitimateClearingCostWordingRemainAvailable() {
        ObjectNode accountingQuestion = objectMapper.createObjectNode();
        accountingQuestion.put("questionId", "ACC-STOCK-TRADE-Q-03");
        accountingQuestion.put("type", "LEDGER_ENTRY");
        assertEquals("按借贷方向逐行核对科目；成本、费用、应付项和清算款分别登记。",
                HumanFeedbackText.practiceHint(accountingQuestion));

        ObjectNode clearingItem = objectMapper.createObjectNode();
        clearingItem.put("criterionId", "C-CLR-EX-REPLACEMENT-COST");
        clearingItem.put("description", "补券成本和费用结果");
        clearingItem.put("evidenceRequirement", "从交收资料核对补券成本和费用");
        String evidence = HumanFeedbackText.normalizeModelEvidence(
                "补券成本和费用已从交收资料核对。",
                clearingItem, true, objectMapper.createObjectNode(), objectMapper.createObjectNode());

        assertEquals("补券成本和费用已从交收资料核对。", evidence);
    }

    private void assertNoCourseMetaLanguage(String value) {
        assertFalse(value.contains("本案例"), value);
        assertFalse(value.contains("本路线"), value);
        assertFalse(value.contains("题面"), value);
        assertFalse(value.contains("可追溯"), value);
        assertFalse(value.contains("结构化作答"), value);
    }
}
