package com.ccb.custodytraining;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.handler;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import com.ccb.custodytraining.auth.AuthConstants;
import com.ccb.custodytraining.config.MockUserBootstrapper;
import com.ccb.custodytraining.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.servlet.resource.ResourceHttpRequestHandler;

@SpringBootTest(properties = {
        "spring.profiles.active=mock",
        "app.mode=mock",
        "spring.datasource.url=jdbc:h2:mem:custody_training_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "server.servlet.session.cookie.secure=false"
})
@AutoConfigureMockMvc
class CustodyTrainingApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MockUserBootstrapper mockUserBootstrapper;

    @Test
    void contextLoads() {
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/map/accounting",
            "/map/supervision",
            "/learn/ACC-LIFE-ROLE-001",
            "/records/42"
    })
    void browserDeepLinksForwardToSpaEntryPoint(String path) throws Exception {
        mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/index.html"));
    }

    @Test
    void unknownApiRouteRemainsJsonNotFound() throws Exception {
        MockHttpSession session = sessionFrom(login(getCsrfSession(), "10000001"));

        mockMvc.perform(get("/api/not-a-route").session(session))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void staticAssetRequestsRemainWithResourceHandler() throws Exception {
        mockMvc.perform(get("/assets/not-a-real-file.js"))
                .andExpect(status().isNotFound())
                .andExpect(handler().handlerType(ResourceHttpRequestHandler.class))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void healthEndpointReturnsExpectedPayload() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.application").value("custody-training"))
                .andExpect(jsonPath("$.mode").value("mock"));
    }

    @Test
    void csrfEndpointReturnsTokenAndHeaderName() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"));
    }

    @Test
    void loginWithoutCsrfIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("10000001", "Demo@1234")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void wrongCredentialsReturnUnifiedUnauthorizedJson() throws Exception {
        CsrfSession csrf = getCsrfSession();

        mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session())
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("10000001", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("员工号或密码错误"));
    }

    @Test
    void loginDoesNotAcceptIdentityFields() throws Exception {
        CsrfSession csrf = getCsrfSession();

        mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session())
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"10000001\",\"password\":\"Demo@1234\","
                                + "\"userId\":\"other-user\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void correctLoginCanReadOwnIdentity() throws Exception {
        CsrfSession csrf = getCsrfSession();

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session())
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("10000001", "Demo@1234")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeNo").value("10000001"))
                .andExpect(jsonPath("$.displayName").value("清算学员"))
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        mockMvc.perform(get("/api/auth/me").session(sessionFrom(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeNo").value("10000001"))
                .andExpect(jsonPath("$.displayName").value("清算学员"));
    }

    @Test
    void loginRotatesSessionIdAndKeepsIdentityAvailable() throws Exception {
        CsrfSession csrf = getCsrfSession();
        String sessionIdBeforeLogin = csrf.session().getId();

        MvcResult login = login(csrf, "10000001");
        MockHttpSession sessionAfterLogin = sessionFrom(login);

        org.junit.jupiter.api.Assertions.assertNotEquals(
                sessionIdBeforeLogin,
                sessionAfterLogin.getId()
        );
        mockMvc.perform(get("/api/auth/me").session(sessionAfterLogin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeNo").value("10000001"));
    }

    @Test
    void independentSessionsKeepTheirOwnIdentities() throws Exception {
        CsrfSession learnerOneCsrf = getCsrfSession();
        MvcResult learnerOneLogin = login(learnerOneCsrf, "10000001");

        CsrfSession learnerTwoCsrf = getCsrfSession();
        MvcResult learnerTwoLogin = login(learnerTwoCsrf, "10000002");

        mockMvc.perform(get("/api/auth/me").session(sessionFrom(learnerOneLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeNo").value("10000001"));
        mockMvc.perform(get("/api/auth/me").session(sessionFrom(learnerTwoLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeNo").value("10000002"));
    }

    @Test
    void protectedMeRequiresLogin() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void logoutRequiresCsrfAndInvalidatesSession() throws Exception {
        CsrfSession csrf = getCsrfSession();
        MvcResult login = login(csrf, "10000001");
        MockHttpSession session = sessionFrom(login);

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .with(csrf.header()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void absoluteSessionTimeoutInvalidatesAuthenticatedSession() throws Exception {
        CsrfSession csrf = getCsrfSession();
        MvcResult login = login(csrf, "10000001");
        MockHttpSession session = sessionFrom(login);
        session.setAttribute(
                AuthConstants.LOGIN_TIME_SESSION_ATTRIBUTE,
                System.currentTimeMillis()
                        - AuthConstants.ABSOLUTE_SESSION_TIMEOUT_MILLIS
                        - 1L
        );

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void passwordsAreStoredAsBcryptHashes() {
        String passwordHash = userRepository.findByEmployeeNo("10000001")
                .orElseThrow()
                .passwordHash();

        org.junit.jupiter.api.Assertions.assertTrue(passwordHash.startsWith("$2"));
        org.junit.jupiter.api.Assertions.assertNotEquals("Demo@1234", passwordHash);
    }

    @Test
    void repeatedMockBootstrapDoesNotDuplicateUsers() throws Exception {
        long initialCount = userRepository.count();
        mockUserBootstrapper.run();
        org.junit.jupiter.api.Assertions.assertEquals(initialCount, userRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(2L, userRepository.count());
    }

    private CsrfSession getCsrfSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession(
                (MockHttpSession) result.getRequest().getSession(false),
                body.get("token").asText(),
                body.get("headerName").asText()
        );
    }

    private MvcResult login(CsrfSession csrf, String employeeNo) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .session(csrf.session())
                        .with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(employeeNo, "Demo@1234")))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String loginJson(String employeeNo, String password) {
        return "{\"employeeNo\":\"" + employeeNo + "\",\"password\":\"" + password + "\"}";
    }

    private MockHttpSession sessionFrom(MvcResult result) {
        return (MockHttpSession) result.getRequest().getSession(false);
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
