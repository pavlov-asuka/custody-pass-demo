package com.ccb.custodytraining.knowledge;

import java.util.List;

public interface KnowledgeAnswerer {

    String answerMode();

    KnowledgeAnswer answer(String question, List<KnowledgeMatch> candidates,
                           String callerExternalId);

    record KnowledgeAnswer(String answer, List<Citation> citations,
                           boolean insufficientKnowledge, String answerMode) {
    }

    record Citation(String topicId, String title) {
    }
}
