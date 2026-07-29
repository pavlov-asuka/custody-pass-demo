package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import com.ccb.custodytraining.knowledge.KnowledgeAnswerer;
import com.ccb.custodytraining.knowledge.KnowledgeCatalog;
import com.ccb.custodytraining.knowledge.KnowledgeMatch;
import com.ccb.custodytraining.knowledge.OpenAiKnowledgeAnswerer;
import com.ccb.custodytraining.model.ModelChatClient;
import com.ccb.custodytraining.model.ModelProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OpenAiKnowledgeAnswererTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final KnowledgeCatalog catalog = new KnowledgeCatalog(objectMapper,
            new com.ccb.custodytraining.casepractice.CaseCatalog(objectMapper));

    @Test
    void parsesLegalJsonAndCitations() {
        List<KnowledgeMatch> candidates = catalog.search("部分交收");
        OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) ->
                "{\"answer\":\"请先核对交收状态。\",\"citedTopicIds\":[\""
                        + candidates.get(0).matchedTopicId() + "\"],\"insufficientKnowledge\":false}", 0);

        KnowledgeAnswerer.KnowledgeAnswer answer = answerer.answer("部分交收", candidates, "10000001");

        assertEquals("OPENAI_COMPATIBLE", answer.answerMode());
        assertEquals(1, answer.citations().size());
        assertEquals(candidates.get(0).matchedTopicId(), answer.citations().get(0).topicId());
        assertTrue(answer.answer().contains("核对"));
    }

    @Test
    void rejectsUnknownAndDuplicateCitations() {
        List<KnowledgeMatch> candidates = catalog.search("部分交收");
        for (String ids : List.of("\"NOPE\"", "\"" + candidates.get(0).matchedTopicId()
                + "\",\"" + candidates.get(0).matchedTopicId() + "\"")) {
            OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) ->
                    "{\"answer\":\"回答\",\"citedTopicIds\":[" + ids
                            + "],\"insufficientKnowledge\":false}", 0);
            assertThrows(RuntimeException.class,
                    () -> answerer.answer("部分交收", candidates, "10000001"));
        }
    }

    @Test
    void repairsMalformedJsonOnlyOnce() {
        AtomicInteger calls = new AtomicInteger();
        List<KnowledgeMatch> candidates = catalog.search("部分交收");
        OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) -> {
            if (calls.getAndIncrement() == 0) {
                return "不是 JSON";
            }
            return "{\"answer\":\"已修复回答\",\"citedTopicIds\":[],\"insufficientKnowledge\":true}";
        }, 1);

        assertTrue(answerer.answer("部分交收", candidates, "10000001").insufficientKnowledge());
        assertEquals(2, calls.get());
    }

    @Test
    void repairsInconsistentSufficientAnswerOnlyOnce() {
        AtomicInteger calls = new AtomicInteger();
        List<KnowledgeMatch> candidates = catalog.search("部分交收");
        String legalId = candidates.get(0).matchedTopicId();
        OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) -> {
            if (calls.getAndIncrement() == 0) {
                return "{\"answer\":\"回答\",\"citedTopicIds\":[],\"insufficientKnowledge\":false}";
            }
            return "{\"answer\":\"已修复回答\",\"citedTopicIds\":[\"" + legalId
                    + "\"],\"insufficientKnowledge\":false}";
        }, 1);

        assertFalse(answerer.answer("部分交收", candidates, "10000001")
                .insufficientKnowledge());
        assertEquals(2, calls.get());
    }

    @Test
    void rejectsBothInconsistentKnowledgeFlags() {
        List<KnowledgeMatch> candidates = catalog.search("部分交收");
        String legalId = candidates.get(0).matchedTopicId();
        List<String> outputs = List.of(
                "{\"answer\":\"回答\",\"citedTopicIds\":[],\"insufficientKnowledge\":false}",
                "{\"answer\":\"回答\",\"citedTopicIds\":[\"" + legalId
                        + "\"],\"insufficientKnowledge\":true}");
        for (String output : outputs) {
            OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) -> output, 0);
            assertThrows(RuntimeException.class,
                    () -> answerer.answer("部分交收", candidates, "10000001"));
        }
    }

    @Test
    void noHitDoesNotCallModel() {
        AtomicInteger calls = new AtomicInteger();
        OpenAiKnowledgeAnswerer answerer = answerer((system, user, caller, budget) -> {
            calls.incrementAndGet();
            return "{}";
        }, 1);

        KnowledgeAnswerer.KnowledgeAnswer answer = answerer.answer("火星航天器颜色与天气", List.of(), "10000001");

        assertTrue(answer.insufficientKnowledge());
        assertEquals(0, calls.get());
    }

    private OpenAiKnowledgeAnswerer answerer(ModelChatClient client, int repairs) {
        ModelProperties properties = new ModelProperties();
        properties.setReviewTimeBudget(Duration.ofSeconds(15));
        properties.setMaxRepairAttempts(repairs);
        return new OpenAiKnowledgeAnswerer(client, objectMapper, properties);
    }
}
