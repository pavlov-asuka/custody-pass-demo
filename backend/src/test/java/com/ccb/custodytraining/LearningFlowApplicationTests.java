package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.ccb.custodytraining.learning.FormalContentCatalog;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(properties = {
        "spring.profiles.active=mock",
        "app.mode=mock",
        "spring.datasource.url=jdbc:h2:mem:custody_learning_flow_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "server.servlet.session.cookie.secure=false"
})
@AutoConfigureMockMvc
class LearningFlowApplicationTests {

    private static final String ROUTE = "ACC-LIFE-ROLE-001";
    private static final String CONTENT_VERSION = "2.0.0";
    private static final String RUBRIC_VERSION = "2.0.0";
    private static final String STOCK_ROUTE = "ACC-STOCK-TRADE-001";
    private static final String STOCK_CONTENT_VERSION = "1.0.0";
    private static final String PASSING_ANSWER = """
            {"responses":{
              "payment-source":"BANK-STATEMENT",
              "ending-payable":800,
              "debit-account":"应付托管费",
              "credit-account":"银行存款",
              "reconciliation-result":"BALANCED",
              "result-note":"当日支付托管费1400元，期末应付托管费800元，资金、台账和估值结果勾稽一致。"
            }}
            """;
    private static final String NOT_MASTERED_ANSWER = """
            {"responses":{
              "payment-source":"PAYMENT-INSTRUCTION",
              "ending-payable":0,
              "debit-account":"银行存款",
              "credit-account":"应付托管费",
              "reconciliation-result":"UNBALANCED",
              "result-note":"已处理。"
            }}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private FormalContentCatalog catalog;

    @BeforeEach
    void cleanLearningData() {
        jdbc.update("DELETE FROM remediation_target");
        jdbc.update("DELETE FROM remediation_plan");
        jdbc.update("DELETE FROM scoring_result");
        jdbc.update("DELETE FROM comprehensive_practice_draft");
        jdbc.update("DELETE FROM formal_attempt");
        jdbc.update("DELETE FROM basic_question_progress");
        jdbc.update("DELETE FROM learning_step_progress");
    }

    @Test
    void worldsExposeOnlyAccountingAndNoFakeProgress() throws Exception {
        Session learner = login("10000001");
        mockMvc.perform(get("/api/worlds").session(learner.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.worlds[0].line").value("CLEARING"))
                .andExpect(jsonPath("$.worlds[0].availability").value("BUILDING"))
                .andExpect(jsonPath("$.worlds[0].publishedRequiredRoutes").value(0))
                .andExpect(jsonPath("$.worlds[1].line").value("ACCOUNTING"))
                .andExpect(jsonPath("$.worlds[1].availability").value("OPEN"))
                .andExpect(jsonPath("$.worlds[2].availability").value("BUILDING"));
        mockMvc.perform(get("/api/lines/CLEARING/map").session(learner.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONTENT_BUILDING"));
    }

    @Test
    void mapDerivesLockedStateAndPublishedProgress() throws Exception {
        Session learner = login("10000001");
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[0].state").value("NOT_STARTED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].state").value("LOCKED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].contentAvailability").value("PUBLISHED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[2].state").value("LOCKED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[3].state").value("LOCKED"))
                .andExpect(jsonPath("$.regions[0].modules[1].nodes[4].pathType").value("ADVANCED"))
                .andExpect(jsonPath("$.regions[0].modules[2].moduleId").value("ACC-MODULE-FIXED-INCOME"))
                .andExpect(jsonPath("$.regions[0].modules[2].nodes.length()").value(9))
                .andExpect(jsonPath("$.regions[0].modules[2].nodes[0].routeId").value("ACC-FI-TRADE-001"))
                .andExpect(jsonPath("$.regions[0].modules[2].nodes[0].state").value("LOCKED"))
                .andExpect(jsonPath("$.regions[0].modules[2].nodes[4].pathType").value("ADVANCED"))
                .andExpect(jsonPath("$.regions[0].modules[3].moduleId").value("ACC-MODULE-FUTURES"))
                .andExpect(jsonPath("$.regions[0].modules[3].nodes.length()").value(4))
                .andExpect(jsonPath("$.regions[0].modules[3].nodes[0].routeId").value("ACC-FUT-CONTRACT-001"))
                .andExpect(jsonPath("$.regions[0].modules[3].nodes[0].state").value("LOCKED"))
                .andExpect(jsonPath("$.regions[0].modules[3].nodes[3].routeId").value("ACC-FUT-RECON-004"))
                .andExpect(jsonPath("$.regions[0].modules[4].moduleId").value("ACC-MODULE-VALUATION-DISCLOSURE"))
                .andExpect(jsonPath("$.regions[0].modules[4].nodes.length()").value(5))
                .andExpect(jsonPath("$.regions[0].modules[4].nodes[0].routeId").value("ACC-ED-WORKPAPER-001"))
                .andExpect(jsonPath("$.regions[0].modules[4].nodes[4].routeId").value("ACC-ED-UPDATES-005"))
                .andExpect(jsonPath("$.progress.publishedRequiredRoutes").value(26));
    }

    @Test
    void firstLearningSequenceIsEnforcedButCompletedStepsCanBeReviewed() throws Exception {
        Session learner = login("10000001");
        mockMvc.perform(get("/api/routes/" + ROUTE + "/steps/DEMONSTRATION")
                        .session(learner.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEARNING_SEQUENCE_VIOLATION"));
        complete(learner, "KNOWLEDGE_CARD", "event-knowledge-0001");
        complete(learner, "KNOWLEDGE_CARD", "event-knowledge-0001");
        mockMvc.perform(get("/api/worlds").session(learner.session()))
                .andExpect(jsonPath("$.worlds[1].status").value("IN_PROGRESS"));
        mockMvc.perform(get("/api/routes/" + ROUTE + "/steps/KNOWLEDGE_CARD")
                        .session(learner.session()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/routes/" + ROUTE + "/steps/DEMONSTRATION")
                        .session(learner.session()))
                .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM learning_step_progress WHERE step_type='KNOWLEDGE_CARD'",
                Integer.class));
    }

    @Test
    void basicPracticeRequiresEveryQuestionCorrectOnceAndNeverReturnsAnswerKey() throws Exception {
        Session learner = login("10000001");
        complete(learner, "KNOWLEDGE_CARD", "event-knowledge-0002");
        complete(learner, "DEMONSTRATION", "event-demo-00000002");
        JsonNode wrong = answerQuestion(learner, "ACC-ROLE-Q-01", List.of("A"));
        assertTrue(!wrong.path("correct").asBoolean());
        assertTrue(!wrong.has("answer"));
        assertTrue(!wrong.has("correctAnswer"));
        answerQuestion(learner, "ACC-ROLE-Q-01", List.of("B"));
        answerQuestion(learner, "ACC-ROLE-Q-02", List.of("B"));
        JsonNode finalAnswer = answerQuestion(learner, "ACC-ROLE-Q-03",
                List.of("SOURCE", "CALC", "POST", "RECON"));
        assertTrue(finalAnswer.path("practiceCompleted").asBoolean());
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM learning_step_progress WHERE step_type='BASIC_PRACTICE'
                """, Integer.class));
    }

    @Test
    void stockBasicPracticeUsesStructuredInputsAndKeepsAnswersPrivate() throws Exception {
        Session learner = prepared("10000001");
        long roleAttempt = submit(learner, requestId(), PASSING_ANSWER).path("attemptId").asLong();
        assertEquals("PASSED", awaitTerminal(learner, roleAttempt).path("historicalConclusion").asText());
        passRoute(learner, "ACC-LIFE-ONBOARD-002");
        passRoute(learner, "ACC-LIFE-DAILY-003");
        stockComplete(learner, "KNOWLEDGE_CARD");
        stockComplete(learner, "DEMONSTRATION");

        JsonNode content = getJson(learner, "/api/routes/" + STOCK_ROUTE
                + "/steps/BASIC_PRACTICE").path("content");
        assertEquals(5, content.path("questions").size());
        assertEquals("FIELD_MAP", content.path("questions").path(0).path("type").asText());
        assertEquals("CALCULATION", content.path("questions").path(1).path("type").asText());
        assertEquals("LEDGER_ENTRY", content.path("questions").path(2).path("type").asText());
        assertEquals("RECONCILIATION", content.path("questions").path(3).path("type").asText());
        assertEquals("SHORT_TEXT", content.path("questions").path(4).path("type").asText());
        for (JsonNode question : content.path("questions")) {
            assertTrue(question.path("answer").isMissingNode());
            assertTrue(question.path("explanation").isMissingNode());
            assertTrue(question.path("hints").isMissingNode());
        }

        JsonNode wrong = stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-02",
                List.of("72000", "90", "60", "-72000"));
        assertTrue(!wrong.path("correct").asBoolean());
        assertTrue(!wrong.has("answer"));
        assertTrue(!wrong.path("explanation").asText().contains("72,030"));
        assertTrue(!wrong.path("hint").asText().contains("72,030"));
        stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-01",
                List.of("BUY_DIRECTION", "CASH_OUTFLOW", "NORMAL_CONTINUE", "TRADE_DAY_PAYABLE"));
        stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-02",
                List.of("72,000", "90", "60", "-72,030"));
        stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-03",
                List.of("金融资产-交易性-股票-成本", "交易费用-股票", "应付佣金", "证券清算款"));
        JsonNode outOfTolerance = stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-04",
                List.of("9.31", "112,000", "18,000", "168,000", "1,031,860", "198,000", "30,000", "BALANCED"));
        assertTrue(!outOfTolerance.path("correct").asBoolean());
        assertTrue(!outOfTolerance.has("answer"));
        assertTrue(!outOfTolerance.path("explanation").asText().contains("9.3333333333"));
        JsonNode rounded = stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-04",
                List.of("9.33", "112,000", "18,000", "168,000", "1,031,860", "198,000", "30,000", "BALANCED"));
        assertTrue(rounded.path("correct").asBoolean());
        JsonNode extraPrecision = stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-04",
                List.of("9.3333", "112,000", "18,000", "168,000", "1,031,860", "198,000", "30,000", "BALANCED"));
        assertTrue(extraPrecision.path("correct").asBoolean());
        JsonNode completed = stockAnswerQuestion(learner, "ACC-STOCK-TRADE-Q-05", List.of(
                "剩余持仓 18,000 股，剩余成本 168,000 元，期末资金 1,031,860 元，期末市值 198,000 元，资金、持仓、成本和估值勾稽一致。"));
        assertTrue(completed.path("practiceCompleted").asBoolean());
    }

    @Test
    void foundationRoutesPassInSequenceAndDailyUnlocksStockAndExit() throws Exception {
        Session learner = prepared("10000001");
        mockMvc.perform(get("/api/routes/ACC-LIFE-ONBOARD-002").session(learner.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("LOCKED"))
                .andExpect(jsonPath("$.enterable").value(false))
                .andExpect(jsonPath("$.steps[0].accessible").value(false));
        long roleAttempt = submit(learner, requestId(), PASSING_ANSWER).path("attemptId").asLong();
        assertEquals("PASSED", awaitTerminal(learner, roleAttempt).path("historicalConclusion").asText());

        assertEquals("PASSED", passRoute(learner, "ACC-LIFE-ONBOARD-002")
                .path("historicalConclusion").asText());
        JsonNode afterOnboard = getJson(learner, "/api/lines/ACCOUNTING/map");
        assertTrue(findNode(afterOnboard, "ACC-LIFE-DAILY-003").path("enterable").asBoolean());
        assertTrue(!findNode(afterOnboard, "ACC-STOCK-TRADE-001").path("enterable").asBoolean());

        assertEquals("PASSED", passRoute(learner, "ACC-LIFE-DAILY-003")
                .path("historicalConclusion").asText());
        JsonNode afterDaily = getJson(learner, "/api/lines/ACCOUNTING/map");
        assertTrue(findNode(afterDaily, "ACC-LIFE-EXIT-004").path("enterable").asBoolean());
        assertTrue(findNode(afterDaily, "ACC-STOCK-TRADE-001").path("enterable").asBoolean());

        assertEquals("PASSED", passRoute(learner, "ACC-LIFE-EXIT-004")
                .path("historicalConclusion").asText());
        assertEquals("PASSED", findNode(getJson(learner, "/api/lines/ACCOUNTING/map"),
                "ACC-LIFE-EXIT-004").path("state").asText());
    }

    @Test
    void draftsAreVersionedAndIsolatedByLearner() throws Exception {
        Session first = prepared("10000001");
        Session second = prepared("10000002");
        saveDraft(first, NOT_MASTERED_ANSWER, 0);
        mockMvc.perform(get("/api/routes/" + ROUTE + "/draft").session(second.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer.responses").isMap())
                .andExpect(jsonPath("$.revision").value(0));
        mockMvc.perform(put("/api/routes/" + ROUTE + "/draft")
                        .session(first.session()).with(first.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftJson(NOT_MASTERED_ANSWER, 0)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DRAFT_CONFLICT"));
    }

    @Test
    void formalSubmissionIsIdempotentAndCreatesImmutableAttemptBeforeScoring() throws Exception {
        Session learner = prepared("10000001");
        String requestId = requestId();
        JsonNode first = submit(learner, requestId, PASSING_ANSWER);
        long attemptId = first.path("attemptId").asLong();
        JsonNode retry = submit(learner, requestId, PASSING_ANSWER);
        assertEquals(attemptId, retry.path("attemptId").asLong());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM formal_attempt", Integer.class));
        mockMvc.perform(post("/api/routes/" + ROUTE + "/attempts")
                        .session(learner.session()).with(learner.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submissionJson(requestId, NOT_MASTERED_ANSWER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        JsonNode completed = awaitTerminal(learner, attemptId);
        assertEquals("COMPLETED", completed.path("processingStatus").asText());
        assertEquals("PASSED", completed.path("historicalConclusion").asText());
    }

    @Test
    void scoringFailureIsTechnicalAndRetryUsesOriginalAttempt() throws Exception {
        Session learner = prepared("10000001");
        JsonNode submitted = submit(learner, requestId(),
                PASSING_ANSWER.replace("勾稽一致。", "勾稽一致。[SCORING_FAIL_ONCE]"));
        long attemptId = submitted.path("attemptId").asLong();
        JsonNode failed = awaitTerminal(learner, attemptId);
        assertEquals("FAILED", failed.path("processingStatus").asText());
        assertTrue(failed.path("historicalConclusion").isMissingNode());
        mockMvc.perform(post("/api/attempts/" + attemptId + "/retry-scoring")
                        .session(learner.session()).with(learner.csrf()))
                .andExpect(status().isOk());
        JsonNode completed = awaitTerminal(learner, attemptId);
        assertEquals("COMPLETED", completed.path("processingStatus").asText());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM formal_attempt", Integer.class));
        assertEquals(2, jdbc.queryForObject(
                "SELECT scoring_run_count FROM formal_attempt WHERE id=?", Integer.class, attemptId));
    }

    @Test
    void mandatoryRequirementOverridesPassingScore() throws Exception {
        Session learner = prepared("10000001");
        String scoreWithoutGates = PASSING_ANSWER.replace("BALANCED", "UNBALANCED");
        JsonNode completed = awaitTerminal(learner,
                submit(learner, requestId(), scoreWithoutGates).path("attemptId").asLong());
        assertTrue(completed.path("result").path("totalScore").asInt() >= 75);
        assertEquals("LEARNED_NOT_MASTERED", completed.path("historicalConclusion").asText());
        assertTrue(!completed.path("result").path("allMandatoryRequirementsMet").asBoolean());
        assertTrue(completed.path("result").path("mandatoryRequirements").isMissingNode());
        assertTrue(completed.toString().contains("\"matched\""));
        assertTrue(!completed.toString().contains("\"itemId\""));
        assertTrue(!completed.toString().contains("M-RECONCILIATION"));
        String storedResult = jdbc.queryForObject(
                "SELECT result_snapshot_json FROM scoring_result WHERE attempt_id=?",
                String.class, completed.path("attemptId").asLong());
        assertTrue(objectMapper.readTree(storedResult)
                .path("mandatoryRequirements").size() > 0);
    }

    @Test
    void remediationMustBeCompletedBeforePracticeRetryAndDoesNotDirectlyPass() throws Exception {
        Session learner = prepared("10000001");
        long attemptId = submitAndAwaitNotMastered(learner);
        mockMvc.perform(post("/api/attempts/" + attemptId + "/comprehensive-practice-retry")
                        .session(learner.session()).with(learner.csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REMEDIATION_REQUIRED"));
        JsonNode plan = getJson(learner, "/api/attempts/" + attemptId + "/remediation");
        for (JsonNode target : plan.path("targets")) {
            String targetId = target.path("targetId").asText();
            String questionId = target.path("practice").path("questionId").asText();
            answerRemediation(learner, attemptId, targetId, correctAnswer(questionId));
        }
        mockMvc.perform(post("/api/attempts/" + attemptId + "/comprehensive-practice-retry")
                        .session(learner.session()).with(learner.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.practiceRetryUnlocked").value(true));
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[0].state")
                        .value("LEARNED_NOT_MASTERED"));
    }

    @Test
    void passingRetryUnlocksNextNode() throws Exception {
        Session learner = prepared("10000001");
        long failedAttempt = submitAndAwaitNotMastered(learner);
        completeAllRemediation(learner, failedAttempt);
        long passedAttempt = submit(learner, requestId(), PASSING_ANSWER)
                .path("attemptId").asLong();
        JsonNode passed = awaitTerminal(learner, passedAttempt);
        assertEquals("PASSED", passed.path("historicalConclusion").asText());
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[0].state").value("PASSED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].state").value("NOT_STARTED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].locked").value(false))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].enterable").value(true));
    }

    @Test
    void fullRemediationJourneyKeepsTwoHistorySnapshotsAndUnlocksNextRoute() throws Exception {
        Session learner = prepared("10000001");
        long failedAttempt = submitAndAwaitNotMastered(learner);
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].locked").value(true));
        mockMvc.perform(post("/api/routes/" + ROUTE + "/attempts")
                        .session(learner.session()).with(learner.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submissionJson(requestId(), PASSING_ANSWER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REMEDIATION_REQUIRED"));
        completeAllRemediation(learner, failedAttempt);
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[0].state")
                        .value("LEARNED_NOT_MASTERED"));
        long passedAttempt = submit(learner, requestId(), PASSING_ANSWER)
                .path("attemptId").asLong();
        assertNotEquals(failedAttempt, passedAttempt);
        JsonNode passed = awaitTerminal(learner, passedAttempt);
        assertEquals("PASSED", passed.path("historicalConclusion").asText());
        assertTrue(passed.path("result").path("scoreThresholdMet").asBoolean());
        assertTrue(passed.path("result").path("allMandatoryRequirementsMet").asBoolean());
        assertTrue(passed.path("result").path("totalScore").asInt()
                >= passed.path("result").path("passScore").asInt());
        mockMvc.perform(get("/api/lines/ACCOUNTING/map").session(learner.session()))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[0].state").value("PASSED"))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].locked").value(false))
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].enterable").value(true));
        JsonNode failedHistory = getJson(learner, "/api/training-records/" + failedAttempt);
        JsonNode passedHistory = getJson(learner, "/api/training-records/" + passedAttempt);
        assertEquals("LEARNED_NOT_MASTERED", failedHistory.path("historicalConclusion").asText());
        assertEquals("PASSED", failedHistory.path("currentRouteState").asText());
        assertEquals("PAYMENT-INSTRUCTION", failedHistory.path("answerSnapshot")
                .path("responses").path("payment-source").asText());
        assertEquals("PASSED", passedHistory.path("historicalConclusion").asText());
        mockMvc.perform(get("/api/training-records?conclusion=LEARNED_NOT_MASTERED")
                        .session(learner.session()))
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/training-records?conclusion=PASSED")
                        .session(learner.session()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void lowReviewAfterPassKeepsRoutePassedButRecordsCurrentConclusion() throws Exception {
        Session learner = prepared("10000001");
        long passedId = submit(learner, requestId(), PASSING_ANSWER).path("attemptId").asLong();
        awaitTerminal(learner, passedId);
        long reviewId = submit(learner, requestId(), NOT_MASTERED_ANSWER)
                .path("attemptId").asLong();
        JsonNode review = awaitTerminal(learner, reviewId);
        assertEquals("LEARNED_NOT_MASTERED", review.path("historicalConclusion").asText());
        assertEquals("PASSED", review.path("currentRouteState").asText());
    }

    @Test
    void recordHistoryIsPaginatedFilteredImmutableAndUserIsolated() throws Exception {
        Session first = prepared("10000001");
        long attemptId = submit(first, requestId(), PASSING_ANSWER).path("attemptId").asLong();
        JsonNode original = awaitTerminal(first, attemptId);
        jdbc.update("UPDATE formal_attempt SET content_version='9.9.9' WHERE id=?", attemptId);
        JsonNode history = getJson(first, "/api/training-records/" + attemptId);
        assertEquals("9.9.9", history.path("contentVersion").asText());
        assertEquals(original.path("answerSnapshot"), history.path("answerSnapshot"));
        mockMvc.perform(get("/api/training-records?line=ACCOUNTING&conclusion=PASSED")
                        .session(first.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        Session second = login("10000002");
        mockMvc.perform(get("/api/training-records/" + attemptId).session(second.session()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/training-records").session(second.session()))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void publicContentNeverLeaksPrivateScoringAssets() throws Exception {
        Session learner = login("10000001");
        String route = mockMvc.perform(get("/api/routes/" + ROUTE).session(learner.session()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String knowledge = mockMvc.perform(get("/api/routes/" + ROUTE + "/steps/KNOWLEDGE_CARD")
                        .session(learner.session()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(route.contains("\"rubricVersion\":\"2.0.0\""));
        for (String body : List.of(route, knowledge)) {
            assertTrue(!body.contains("referenceAnswer"));
            assertTrue(!body.contains("mandatoryRequirements"));
            assertTrue(!body.contains("\"evidenceRules\""));
        }
        mockMvc.perform(get("/api/cases").session(learner.session()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/knowledge/topics").session(learner.session()))
                .andExpect(status().isNotFound());
    }

    private Session prepared(String employeeNo) throws Exception {
        Session session = login(employeeNo);
        complete(session, "KNOWLEDGE_CARD", requestId());
        complete(session, "DEMONSTRATION", requestId());
        answerQuestion(session, "ACC-ROLE-Q-01", List.of("B"));
        answerQuestion(session, "ACC-ROLE-Q-02", List.of("B"));
        answerQuestion(session, "ACC-ROLE-Q-03", List.of("SOURCE", "CALC", "POST", "RECON"));
        return session;
    }

    private JsonNode passRoute(Session session, String routeId) throws Exception {
        FormalContentCatalog.RouteBundle bundle = catalog.route(routeId);
        String contentVersion = bundle.contentVersion();
        String rubricVersion = bundle.rubricVersion();
        completeRouteStep(session, routeId, "KNOWLEDGE_CARD", contentVersion);
        completeRouteStep(session, routeId, "DEMONSTRATION", contentVersion);
        for (JsonNode question : bundle.content().path("steps").path("BASIC_PRACTICE").path("questions")) {
            List<String> answer = new java.util.ArrayList<>();
            for (JsonNode item : question.path("answer")) {
                answer.add(item.asText());
            }
            if ("SHORT_TEXT".equals(question.path("type").asText())) {
                answer = List.of(String.join("，", answer));
            }
            if ("CALCULATION".equals(question.path("type").asText())) {
                List<String> wrongAnswer = java.util.Collections.nCopies(answer.size(), "0");
                JsonNode rejected = answerRouteQuestionResult(session, routeId,
                        question.path("questionId").asText(), contentVersion, wrongAnswer);
                assertTrue(!rejected.path("correct").asBoolean());
                assertTrue(!rejected.has("answer"));
                assertTrue(!rejected.path("explanation").asText().contains(answer.get(0)));
            }
            answerRouteQuestion(session, routeId, question.path("questionId").asText(),
                    contentVersion, answer);
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.put("clientRequestId", requestId());
        body.put("contentVersion", contentVersion);
        body.put("rubricVersion", rubricVersion);
        body.set("answer", bundle.rubric().path("referenceAnswer").deepCopy());
        MvcResult result = mockMvc.perform(post("/api/routes/" + routeId + "/attempts")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk()).andReturn();
        long attemptId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("attemptId").asLong();
        JsonNode terminal = awaitTerminal(session, attemptId);
        assertEquals("PASSED", terminal.path("historicalConclusion").asText());
        return terminal;
    }

    private void completeRouteStep(Session session, String routeId, String step,
                                   String contentVersion) throws Exception {
        mockMvc.perform(post("/api/routes/" + routeId + "/steps/" + step + "/complete")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + requestId() + "\","
                                + "\"contentVersion\":\"" + contentVersion + "\"}"))
                .andExpect(status().isOk());
    }

    private void answerRouteQuestion(Session session, String routeId, String questionId,
                                     String contentVersion, List<String> answer) throws Exception {
        JsonNode result = answerRouteQuestionResult(session, routeId, questionId, contentVersion, answer);
        assertTrue(result.path("correct").asBoolean());
    }

    private JsonNode answerRouteQuestionResult(Session session, String routeId, String questionId,
                                               String contentVersion, List<String> answer) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("requestId", requestId());
        body.put("contentVersion", contentVersion);
        body.putArray("answer").addAll(answer.stream()
                .map(objectMapper.getNodeFactory()::textNode).toList());
        MvcResult result = mockMvc.perform(post("/api/routes/" + routeId + "/basic-practice/"
                        + questionId + "/answers")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode findNode(JsonNode map, String routeId) {
        for (JsonNode region : map.path("regions")) {
            for (JsonNode module : region.path("modules")) {
                for (JsonNode node : module.path("nodes")) {
                    if (routeId.equals(node.path("routeId").asText())) {
                        return node;
                    }
                }
            }
        }
        throw new IllegalArgumentException("路线节点不存在: " + routeId);
    }

    private long submitAndAwaitNotMastered(Session session) throws Exception {
        long id = submit(session, requestId(), NOT_MASTERED_ANSWER).path("attemptId").asLong();
        JsonNode result = awaitTerminal(session, id);
        assertEquals("LEARNED_NOT_MASTERED", result.path("historicalConclusion").asText());
        return id;
    }

    private void completeAllRemediation(Session session, long attemptId) throws Exception {
        JsonNode plan = getJson(session, "/api/attempts/" + attemptId + "/remediation");
        for (JsonNode target : plan.path("targets")) {
            String targetId = target.path("targetId").asText();
            String questionId = target.path("practice").path("questionId").asText();
            answerRemediation(session, attemptId, targetId, correctAnswer(questionId));
        }
    }

    private List<String> correctAnswer(String questionId) {
        return switch (questionId) {
            case "ACC-ROLE-Q-01" -> List.of("B");
            case "ACC-ROLE-Q-02" -> List.of("B");
            case "ACC-ROLE-Q-03" -> List.of("SOURCE", "CALC", "POST", "RECON");
            default -> throw new IllegalArgumentException(questionId);
        };
    }

    private void answerRemediation(Session session, long attemptId, String targetId,
                                   List<String> answer) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("requestId", requestId());
        body.putArray("answer").addAll(answer.stream().map(objectMapper.getNodeFactory()::textNode).toList());
        mockMvc.perform(post("/api/attempts/" + attemptId + "/remediation/" + targetId + "/answers")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(true));
    }

    private JsonNode awaitTerminal(Session session, long attemptId) throws Exception {
        JsonNode result = null;
        for (int i = 0; i < 100; i++) {
            result = getJson(session, "/api/attempts/" + attemptId);
            if (!"SCORING".equals(result.path("processingStatus").asText())) {
                return result;
            }
            Thread.sleep(20);
        }
        throw new AssertionError("评分未在测试时限内结束: " + result);
    }

    private JsonNode getJson(Session session, String path) throws Exception {
        MvcResult result = mockMvc.perform(get(path).session(session.session()))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode submit(Session session, String requestId, String answer) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/routes/" + ROUTE + "/attempts")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submissionJson(requestId, answer)))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String submissionJson(String requestId, String answer) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("clientRequestId", requestId);
        body.put("contentVersion", CONTENT_VERSION);
        body.put("rubricVersion", RUBRIC_VERSION);
        try {
            body.set("answer", objectMapper.readTree(answer));
        } catch (Exception exception) {
            throw new IllegalArgumentException("测试综合实务答案必须是 JSON", exception);
        }
        return body.toString();
    }

    private JsonNode answerQuestion(Session session, String questionId,
                                    List<String> answer) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("requestId", requestId());
        body.put("contentVersion", CONTENT_VERSION);
        body.putArray("answer").addAll(answer.stream().map(objectMapper.getNodeFactory()::textNode).toList());
        MvcResult result = mockMvc.perform(post("/api/routes/" + ROUTE
                        + "/basic-practice/" + questionId + "/answers")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode stockAnswerQuestion(Session session, String questionId,
                                         List<String> answer) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("requestId", requestId());
        body.put("contentVersion", STOCK_CONTENT_VERSION);
        body.putArray("answer").addAll(answer.stream().map(objectMapper.getNodeFactory()::textNode).toList());
        MvcResult result = mockMvc.perform(post("/api/routes/" + STOCK_ROUTE
                        + "/basic-practice/" + questionId + "/answers")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private void complete(Session session, String step, String eventId) throws Exception {
        mockMvc.perform(post("/api/routes/" + ROUTE + "/steps/" + step + "/complete")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + eventId + "\","
                                + "\"contentVersion\":\"" + CONTENT_VERSION + "\"}"))
                .andExpect(status().isOk());
    }

    private void stockComplete(Session session, String step) throws Exception {
        mockMvc.perform(post("/api/routes/" + STOCK_ROUTE + "/steps/" + step + "/complete")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + requestId() + "\","
                                + "\"contentVersion\":\"" + STOCK_CONTENT_VERSION + "\"}"))
                .andExpect(status().isOk());
    }

    private void saveDraft(Session session, String answer, long revision) throws Exception {
        mockMvc.perform(put("/api/routes/" + ROUTE + "/draft")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftJson(answer, revision)))
                .andExpect(status().isOk());
    }

    private String draftJson(String answer, long revision) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("contentVersion", CONTENT_VERSION);
        body.set("answer", objectMapper.readTree(answer));
        body.put("expectedRevision", revision);
        return body.toString();
    }

    private Session login(String employeeNo) throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        JsonNode csrfBody = objectMapper.readTree(csrfResult.getResponse().getContentAsString());
        MockHttpSession session = (MockHttpSession) csrfResult.getRequest().getSession(false);
        Session loginSession = new Session(session, csrfBody.path("headerName").asText(),
                csrfBody.path("token").asText());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .session(session).with(loginSession.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"" + employeeNo
                                + "\",\"password\":\"Demo@1234\"}"))
                .andExpect(status().isOk()).andReturn();
        return new Session((MockHttpSession) login.getRequest().getSession(false),
                loginSession.headerName(), loginSession.token());
    }

    private String requestId() {
        return "req-" + UUID.randomUUID().toString().replace("-", "");
    }

    private record Session(MockHttpSession session, String headerName, String token) {
        private RequestPostProcessor csrf() {
            return request -> {
                request.addHeader(headerName, token);
                return request;
            };
        }
    }
}
