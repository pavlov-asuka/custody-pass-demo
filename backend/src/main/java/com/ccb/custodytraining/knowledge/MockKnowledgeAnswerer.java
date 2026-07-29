package com.ccb.custodytraining.knowledge;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.knowledge.answer-mode", havingValue = "mock", matchIfMissing = true)
public class MockKnowledgeAnswerer implements KnowledgeAnswerer {

    @Override
    public String answerMode() {
        return "MOCK";
    }

    @Override
    public KnowledgeAnswer answer(String question, List<KnowledgeMatch> candidates,
                                  String callerExternalId) {
        if (candidates.isEmpty()) {
            return new KnowledgeAnswer("当前知识库不足，暂不能提供可靠回答。", List.of(), true, answerMode());
        }
        List<Citation> citations = candidates.stream()
                .map(match -> new Citation(match.matchedTopicId(), match.entry().title()))
                .toList();
        String summary = candidates.stream()
                .map(match -> match.entry().content())
                .map(MockKnowledgeAnswerer::shorten)
                .collect(java.util.stream.Collectors.joining("；"));
        String answer = "根据当前演示知识库，相关信息如下：" + summary
                + "。以上内容为演示占位材料，正式业务处理请以经审核的制度和操作指引为准。";
        return new KnowledgeAnswer(answer, citations, false, answerMode());
    }

    private static String shorten(String value) {
        return value.length() <= 100 ? value : value.substring(0, 100) + "…";
    }
}
