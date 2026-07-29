package com.ccb.custodytraining.knowledge;

import java.util.List;

import com.ccb.custodytraining.web.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class KnowledgeService {

    private final KnowledgeCatalog catalog;
    private final KnowledgeAnswerer answerer;

    public KnowledgeService(KnowledgeCatalog catalog, KnowledgeAnswerer answerer) {
        this.catalog = catalog;
        this.answerer = answerer;
    }

    public List<KnowledgeCatalog.KnowledgeTopicDto> topics() {
        return catalog.publicTopics();
    }

    public KnowledgeAnswerer.KnowledgeAnswer ask(JsonNode body, String callerExternalId) {
        String question = parseQuestion(body);
        return answerer.answer(question, catalog.search(question), callerExternalId);
    }

    private String parseQuestion(JsonNode body) {
        if (body == null || !body.isObject() || body.size() != 1
                || !body.has("question") || !body.get("question").isTextual()) {
            throw new BadRequestException("请求必须且只能包含 question 字段");
        }
        String question = body.get("question").textValue().trim();
        if (question.length() < 2 || question.length() > 500) {
            throw new BadRequestException("question 长度必须为 2-500 个字符");
        }
        return question;
    }
}
