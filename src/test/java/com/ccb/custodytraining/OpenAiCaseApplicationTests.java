package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import com.ccb.custodytraining.casepractice.CaseAsset;
import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.model.ModelChatClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "spring.profiles.active=mock",
        "app.mode=mock",
        "app.review.mode=openai",
        "spring.datasource.url=jdbc:h2:mem:custody_training_openai_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "server.servlet.session.cookie.secure=false",
        "app.model.api-key=test-secret",
        "app.model.model-name=test-model",
        "app.model.review-time-budget=15s",
        "app.model.max-repair-attempts=0"
})
@AutoConfigureMockMvc
class OpenAiCaseApplicationTests {

    private static HttpServer server;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CaseCatalog caseCatalog;

    @Autowired
    private ModelChatClient modelChatClient;

    @Test
    void defaultTransportCreatesOnlyOpenAiCompatibleClient() {
        assertEquals("OPENAI_COMPATIBLE", modelChatClient.mode());
    }

    static {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", OpenAiCaseApplicationTests::handleModelRequest);
            server.start();
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    @AfterAll
    static void stopGateway() {
        if (server != null) {
            server.stop(0);
        }
    }

    @DynamicPropertySource
    static void modelProperties(DynamicPropertyRegistry registry) {
        registry.add("app.model.base-url", () ->
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
    }

    @Test
    void openAiSubmissionStoresModeAndUsesJavaWeightSum() throws Exception {
        MockHttpSession session = login();
        String requestId = "req-openai-1234";
        String csrfToken = getCsrfToken(session);

        MvcResult result = mockMvc.perform(post("/api/cases/C001/submissions")
                        .session(session)
                        .header("X-CSRF-TOKEN", csrfToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.createObjectNode()
                                .put("clientRequestId", requestId)
                                .put("answer", "合成答案，不含真实业务数据")
                                .toString()))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals("OPENAI_COMPATIBLE", response.get("reviewerMode").asText());
        assertEquals(100, response.get("totalScore").asInt());
    }

    private MockHttpSession login() throws Exception {
        CsrfSession csrf = getCsrfSession();
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session())
                        .header(csrf.headerName(), csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"10000001\",\"password\":\"Demo@1234\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String getCsrfToken(MockHttpSession session) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf").session(session))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private CsrfSession getCsrfSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                body.get("token").asText(), body.get("headerName").asText());
    }

    private record CsrfSession(MockHttpSession session, String token, String headerName) {
    }

    private static void handleModelRequest(HttpExchange exchange) throws IOException {
        String response = "{\"choices\":[{\"message\":{\"content\":\""
                + escapedReviewJson() + "\"}}]}";
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static String escapedReviewJson() {
        return "{\\\"pointDecisions\\\":["
                + "{\\\"pointId\\\":\\\"C001-CON-01\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-CON-02\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-CON-03\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-PRO-01\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-PRO-02\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-PRO-03\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-RIS-01\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-RIS-02\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-RIS-03\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-EXP-01\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"},"
                + "{\\\"pointId\\\":\\\"C001-EXP-02\\\",\\\"matched\\\":true,\\\"evidence\\\":\\\"合成证据\\\"}]}";
    }
}
