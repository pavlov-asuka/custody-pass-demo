package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.casepractice.CaseDimension;
import com.ccb.custodytraining.casepractice.CaseReviewer;
import com.ccb.custodytraining.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
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
        "spring.datasource.url=jdbc:h2:mem:custody_training_case_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "server.servlet.session.cookie.secure=false"
})
@AutoConfigureMockMvc
class CasePracticeApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CaseCatalog caseCatalog;

    @Autowired
    private CaseReviewer caseReviewer;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanTrainingRecords() {
        jdbcTemplate.update("DELETE FROM training_record");
    }

    @Test
    void allPlaceholderCasesLoadWithFixedRubric() {
        assertEquals("MOCK_RULES", caseReviewer.reviewerMode());
        assertEquals(3, caseCatalog.findAll().size());
        caseCatalog.findAll().forEach(asset -> {
            assertEquals(100, asset.dimensions().values().stream()
                    .mapToInt(dimension -> dimension.points().stream()
                            .mapToInt(point -> point.weight()).sum()).sum());
            for (CaseDimension dimension : CaseDimension.values()) {
                assertEquals(dimension.maxScore(), asset.dimensions().get(dimension).maxScore());
            }
        });
    }

    @Test
    void protectedCaseAndRecordEndpointsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/cases")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/training-records")).andExpect(status().isUnauthorized());
    }

    @Test
    void loggedInLearnerCanListAndFilterThreeCases() throws Exception {
        MockHttpSession session = login("10000001");

        mockMvc.perform(get("/api/cases").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(3)));
        mockMvc.perform(get("/api/cases?line=CLEARING").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("C001"));
    }

    @Test
    void publicCaseDetailDoesNotExposePrivateRubric() throws Exception {
        mockMvc.perform(get("/api/cases/C001").session(login("10000001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.background").isString())
                .andExpect(jsonPath("$.tasks").isArray())
                .andExpect(jsonPath("$.referenceAnswer").doesNotExist())
                .andExpect(jsonPath("$.rubric").doesNotExist())
                .andExpect(jsonPath("$.points").doesNotExist())
                .andExpect(jsonPath("$.weights").doesNotExist())
                .andExpect(jsonPath("$.keywords").doesNotExist())
                .andExpect(jsonPath("$.knowledgeTopicIds").doesNotExist());
    }

    @Test
    void invalidCaseAndPagingParametersReturnBadRequest() throws Exception {
        MockHttpSession session = login("10000001");
        mockMvc.perform(get("/api/cases?line=OTHER").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        mockMvc.perform(get("/api/cases/UNKNOWN").session(session))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/training-records?size=0").session(session))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/training-records?size=51").session(session))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submissionRequiresCsrfAndRejectsExtraIdentityField() throws Exception {
        MockHttpSession session = login("10000001");
        String requestId = requestId();
        mockMvc.perform(post("/api/cases/C001/submissions")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(requestId, "部分交收")))
                .andExpect(status().isForbidden());

        CsrfSession csrf = csrfForSession(session);
        mockMvc.perform(post("/api/cases/C001/submissions")
                        .session(session)
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientRequestId\":\"" + requestId
                                + "\",\"answer\":\"部分交收\",\"userId\":\"other\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validSubmissionUsesMockRulesAndPersistsFourDimensions() throws Exception {
        MockHttpSession session = login("10000001");
        CsrfSession csrf = csrfForSession(session);
        String requestId = requestId();
        String answer = "部分交收后先核对交收状态、资产范围和资金范围，进行差异分类并记录异常，跟进未完成部分，" +
                "识别结算风险，评估影响，安排复核，说明事实和措施，明确责任人和反馈节点。";

        MvcResult result = mockMvc.perform(post("/api/cases/C001/submissions")
                        .session(session)
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(requestId, answer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewerMode").value("MOCK_RULES"))
                .andExpect(jsonPath("$.totalMaxScore").value(100))
                .andExpect(jsonPath("$.dimensions", org.hamcrest.Matchers.hasSize(4)))
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        int total = body.get("dimensions").findValuesAsText("score").stream()
                .mapToInt(Integer::parseInt).sum();
        assertEquals(total, body.get("totalScore").asInt());
        assertTrue(body.get("totalScore").asInt() > 0);
        assertEquals(1L, userRecordCount("10000001"));
    }

    @Test
    void sameRequestIdIsIdempotentAndConflictsAreRejected() throws Exception {
        MockHttpSession session = login("10000001");
        CsrfSession csrf = csrfForSession(session);
        String requestId = requestId();
        String answer = "部分交收，先核对交收状态。";

        JsonNode first = submit(session, csrf, "C001", requestId, answer);
        JsonNode retry = submit(session, csrf, "C001", requestId, answer);
        assertEquals(first.get("recordId").asLong(), retry.get("recordId").asLong());
        assertEquals(1L, userRecordCount("10000001"));

        mockMvc.perform(post("/api/cases/C001/submissions")
                        .session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(requestId, "不同答案")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        mockMvc.perform(post("/api/cases/C002/submissions")
                        .session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(requestId, answer)))
                .andExpect(status().isConflict());
    }

    @Test
    void recordsAreIsolatedAndRequestIdCanBeReusedByAnotherLearner() throws Exception {
        MockHttpSession firstSession = login("10000001");
        CsrfSession firstCsrf = csrfForSession(firstSession);
        String requestId = requestId();
        JsonNode first = submit(firstSession, firstCsrf, "C001", requestId, "部分交收");
        long firstRecordId = first.get("recordId").asLong();

        MockHttpSession secondSession = login("10000002");
        CsrfSession secondCsrf = csrfForSession(secondSession);
        submit(secondSession, secondCsrf, "C001", requestId, "部分交收和结算风险");

        mockMvc.perform(get("/api/training-records/" + firstRecordId).session(secondSession))
                .andExpect(status().isNotFound());
        assertEquals(1L, userRecordCount("10000001"));
        assertEquals(1L, userRecordCount("10000002"));
    }

    @Test
    void recordDetailReadsPersistedSnapshot() throws Exception {
        MockHttpSession session = login("10000001");
        CsrfSession csrf = csrfForSession(session);
        String requestId = requestId();
        JsonNode submitted = submit(session, csrf, "C001", requestId, "部分交收");
        long recordId = submitted.get("recordId").asLong();
        String snapshot = jdbcTemplate.queryForObject(
                "SELECT snapshot_json FROM training_record WHERE id = ?", String.class, recordId);
        jdbcTemplate.update("UPDATE training_record SET snapshot_json = ? WHERE id = ?",
                snapshot.replace("建议复习知识主题", "数据库快照建议主题"), recordId);

        mockMvc.perform(get("/api/training-records/" + recordId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.learningSuggestions[0].text")
                        .value(org.hamcrest.Matchers.startsWith("数据库快照建议主题")));
    }

    @Test
    void learnerCannotReadAnotherLearnersRecordsThroughList() throws Exception {
        MockHttpSession firstSession = login("10000001");
        CsrfSession firstCsrf = csrfForSession(firstSession);
        submit(firstSession, firstCsrf, "C001", requestId(), "部分交收");
        mockMvc.perform(get("/api/training-records").session(login("10000002")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    private JsonNode submit(MockHttpSession session, CsrfSession csrf, String caseId,
                            String requestId, String answer) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/cases/" + caseId + "/submissions")
                        .session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submission(requestId, answer)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MockHttpSession login(String employeeNo) throws Exception {
        CsrfSession csrf = getCsrfSession();
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session()).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"" + employeeNo
                                + "\",\"password\":\"Demo@1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) login.getRequest().getSession(false);
    }

    private CsrfSession getCsrfSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                body.get("token").asText(), body.get("headerName").asText());
    }

    private CsrfSession csrfForSession(MockHttpSession session) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf").session(session))
                .andExpect(status().isOk()).andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession(session, body.get("token").asText(), body.get("headerName").asText());
    }

    private long userRecordCount(String employeeNo) {
        Long userId = userRepository.findByEmployeeNo(employeeNo).orElseThrow().id();
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM training_record WHERE user_id = ?", Long.class, userId);
        return count == null ? 0L : count;
    }

    private String requestId() {
        return "req-" + UUID.randomUUID().toString().replace("-", "");
    }

    private String submission(String requestId, String answer) {
        return objectMapper.createObjectNode()
                .put("clientRequestId", requestId)
                .put("answer", answer)
                .toString();
    }

    private record CsrfSession(MockHttpSession session, String token, String headerName) {
        private RequestPostProcessor header() {
            return request -> {
                request.addHeader(headerName, token);
                return request;
            };
        }
    }
}
