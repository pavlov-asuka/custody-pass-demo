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
    private static final String CONTENT_VERSION = "1.0.0";
    private static final String RUBRIC_VERSION = "1.0.0";
    private static final String PASSING_ANSWER = """
            我作为组合核算人员仍对结果负责。系统执行成功不代表业务结果正确，不能替代人工核验。
            我会先核实再判断：确认7月9日托管费指令和余额事实，核查数据、账务结果和估值结果。
            随后协调相关岗位，按权限复核或报告升级，判断是否影响账务和估值。
            异常消除后反馈结论并持续跟踪闭环，保存处理记录并留痕，不擅自越权承诺。
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void cleanLearningData() {
        jdbc.update("DELETE FROM remediation_target");
        jdbc.update("DELETE FROM remediation_plan");
        jdbc.update("DELETE FROM scoring_result");
        jdbc.update("DELETE FROM exception_case_draft");
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
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].contentAvailability").value("BUILDING"))
                .andExpect(jsonPath("$.progress.publishedRequiredRoutes").value(1));
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
        answerQuestion(learner, "ACC-ROLE-Q-02", List.of("A", "B", "D"));
        JsonNode finalAnswer = answerQuestion(learner, "ACC-ROLE-Q-03",
                List.of("FACT", "CHECK", "ACTION", "FEEDBACK"));
        assertTrue(finalAnswer.path("practiceCompleted").asBoolean());
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM learning_step_progress WHERE step_type='BASIC_PRACTICE'
                """, Integer.class));
    }

    @Test
    void draftsAreVersionedAndIsolatedByLearner() throws Exception {
        Session first = prepared("10000001");
        Session second = prepared("10000002");
        saveDraft(first, "第一位学员草稿", 0);
        mockMvc.perform(get("/api/routes/" + ROUTE + "/draft").session(second.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value(""))
                .andExpect(jsonPath("$.revision").value(0));
        mockMvc.perform(put("/api/routes/" + ROUTE + "/draft")
                        .session(first.session()).with(first.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentVersion\":\"1.0.0\",\"answer\":\"冲突\","
                                + "\"expectedRevision\":0}"))
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
                        .content(submissionJson(requestId, "不同答案")))
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
                PASSING_ANSWER + " [SCORING_FAIL_ONCE]");
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
        String scoreWithoutGates = """
                事实 托管费 7月9日 核查数据 估值结果 协调 复核 报告 反馈 跟踪 闭环
                权限 影响账务 影响估值 留痕 处理记录 措施 责任人 按权限 谨慎 核算岗不是
                """;
        JsonNode completed = awaitTerminal(learner,
                submit(learner, requestId(), scoreWithoutGates).path("attemptId").asLong());
        assertTrue(completed.path("result").path("totalScore").asInt() >= 75);
        assertEquals("LEARNED_NOT_MASTERED", completed.path("historicalConclusion").asText());
        assertTrue(!completed.path("result").path("allMandatoryRequirementsMet").asBoolean());
        assertTrue(completed.path("result").path("mandatoryRequirements").isMissingNode());
        assertTrue(completed.toString().contains("\"matched\""));
        assertTrue(!completed.toString().contains("\"itemId\""));
        assertTrue(!completed.toString().contains("M-VERIFY-FIRST"));
        String storedResult = jdbc.queryForObject(
                "SELECT result_snapshot_json FROM scoring_result WHERE attempt_id=?",
                String.class, completed.path("attemptId").asLong());
        assertTrue(objectMapper.readTree(storedResult)
                .path("mandatoryRequirements").size() > 0);
    }

    @Test
    void remediationMustBeCompletedBeforeFullChallengeAndDoesNotDirectlyPass() throws Exception {
        Session learner = prepared("10000001");
        long attemptId = submitAndAwaitNotMastered(learner);
        mockMvc.perform(post("/api/attempts/" + attemptId + "/challenge")
                        .session(learner.session()).with(learner.csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("REMEDIATION_REQUIRED"));
        JsonNode plan = getJson(learner, "/api/attempts/" + attemptId + "/remediation");
        for (JsonNode target : plan.path("targets")) {
            String targetId = target.path("targetId").asText();
            String questionId = target.path("practice").path("questionId").asText();
            answerRemediation(learner, attemptId, targetId, correctAnswer(questionId));
        }
        mockMvc.perform(post("/api/attempts/" + attemptId + "/challenge")
                        .session(learner.session()).with(learner.csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.challengeUnlocked").value(true));
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
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].enterable").value(false));
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
                .andExpect(jsonPath("$.regions[0].modules[0].nodes[1].enterable").value(false));
        JsonNode failedHistory = getJson(learner, "/api/training-records/" + failedAttempt);
        JsonNode passedHistory = getJson(learner, "/api/training-records/" + passedAttempt);
        assertEquals("LEARNED_NOT_MASTERED", failedHistory.path("historicalConclusion").asText());
        assertEquals("PASSED", failedHistory.path("currentRouteState").asText());
        assertEquals("事实", failedHistory.path("answerSnapshot").asText());
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
        long reviewId = submit(learner, requestId(), "只写一句简短答复")
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
        assertEquals(original.path("answerSnapshot").asText(), history.path("answerSnapshot").asText());
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
        assertTrue(route.contains("\"rubricVersion\":\"1.0.0\""));
        for (String body : List.of(route, knowledge)) {
            assertTrue(!body.contains("referenceAnswer"));
            assertTrue(!body.contains("mandatoryRequirements"));
            assertTrue(!body.contains("\"keywords\""));
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
        answerQuestion(session, "ACC-ROLE-Q-02", List.of("A", "B", "D"));
        answerQuestion(session, "ACC-ROLE-Q-03", List.of("FACT", "CHECK", "ACTION", "FEEDBACK"));
        return session;
    }

    private long submitAndAwaitNotMastered(Session session) throws Exception {
        long id = submit(session, requestId(), "事实").path("attemptId").asLong();
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
            case "ACC-ROLE-Q-02" -> List.of("A", "B", "D");
            case "ACC-ROLE-Q-03" -> List.of("FACT", "CHECK", "ACTION", "FEEDBACK");
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
        body.put("answer", answer);
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

    private void complete(Session session, String step, String eventId) throws Exception {
        mockMvc.perform(post("/api/routes/" + ROUTE + "/steps/" + step + "/complete")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":\"" + eventId + "\","
                                + "\"contentVersion\":\"1.0.0\"}"))
                .andExpect(status().isOk());
    }

    private void saveDraft(Session session, String answer, long revision) throws Exception {
        mockMvc.perform(put("/api/routes/" + ROUTE + "/draft")
                        .session(session.session()).with(session.csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentVersion\":\"1.0.0\",\"answer\":\"" + answer
                                + "\",\"expectedRevision\":" + revision + "}"))
                .andExpect(status().isOk());
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
