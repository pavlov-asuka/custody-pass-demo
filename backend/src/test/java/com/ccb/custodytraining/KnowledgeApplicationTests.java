package com.ccb.custodytraining;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest(properties = {
        "spring.profiles.active=mock",
        "app.mode=mock",
        "spring.datasource.url=jdbc:h2:mem:custody_training_knowledge_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "server.servlet.session.cookie.secure=false"
})
@AutoConfigureMockMvc
class KnowledgeApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void knowledgeEndpointsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/knowledge/topics")).andExpect(status().isUnauthorized());
        CsrfSession csrf = csrfForSession(null);
        mockMvc.perform(post("/api/knowledge/questions")
                        .session(csrf.session()).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"部分交收\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void topicsExposeOnlyPublicMetadata() throws Exception {
        mockMvc.perform(get("/api/knowledge/topics").session(login("10000001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(23)))
                .andExpect(jsonPath("$[0].topicId").isString())
                .andExpect(jsonPath("$[0].title").isString())
                .andExpect(jsonPath("$[0].route").isString())
                .andExpect(jsonPath("$[0].content").doesNotExist())
                .andExpect(jsonPath("$[0].reviewStatus").doesNotExist())
                .andExpect(jsonPath("$[0].aliases").doesNotExist());
    }

    @Test
    void questionValidationAndMockResponseAreDeterministic() throws Exception {
        MockHttpSession session = login("10000001");
        CsrfSession csrf = csrfForSession(session);

        mockMvc.perform(post("/api/knowledge/questions").session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/knowledge/questions").session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"部分交收\",\"extra\":1}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/knowledge/questions").session(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"部分交收\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/knowledge/questions").session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"部分交收\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").isString())
                .andExpect(jsonPath("$.citations").isArray())
                .andExpect(jsonPath("$.citations", hasSize(3)))
                .andExpect(jsonPath("$.insufficientKnowledge").value(false))
                .andExpect(jsonPath("$.answerMode").value("MOCK"));

        mockMvc.perform(post("/api/knowledge/questions").session(session).with(csrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"火星航天器颜色与天气\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.citations", hasSize(0)))
                .andExpect(jsonPath("$.insufficientKnowledge").value(true));
    }

    @Test
    void differentLearnersHaveIndependentStatelessQuestions() throws Exception {
        MockHttpSession first = login("10000001");
        MockHttpSession second = login("10000002");
        CsrfSession firstCsrf = csrfForSession(first);
        CsrfSession secondCsrf = csrfForSession(second);

        String firstBody = mockMvc.perform(post("/api/knowledge/questions").session(first).with(firstCsrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"部分交收\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String secondBody = mockMvc.perform(post("/api/knowledge/questions").session(second).with(secondCsrf.header())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"火星航天器颜色与天气\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        JsonNode firstJson = objectMapper.readTree(firstBody);
        JsonNode secondJson = objectMapper.readTree(secondBody);
        org.junit.jupiter.api.Assertions.assertFalse(firstJson.get("insufficientKnowledge").asBoolean());
        org.junit.jupiter.api.Assertions.assertTrue(secondJson.get("insufficientKnowledge").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(0, secondJson.get("citations").size());
    }

    private MockHttpSession login(String employeeNo) throws Exception {
        CsrfSession csrf = csrfForSession((MockHttpSession) null);
        MvcResult result = mockMvc.perform(post("/api/auth/login").session(csrf.session())
                        .with(csrf.header()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeNo\":\"" + employeeNo + "\",\"password\":\"Demo@1234\"}"))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private CsrfSession csrfForSession(MockHttpSession session) throws Exception {
        MvcResult result = session == null
                ? mockMvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn()
                : mockMvc.perform(get("/api/auth/csrf").session(session)).andExpect(status().isOk()).andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return new CsrfSession((MockHttpSession) result.getRequest().getSession(false),
                body.get("token").asText(), body.get("headerName").asText());
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
