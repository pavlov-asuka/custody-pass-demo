package com.ccb.custodytraining.knowledge;

import java.util.List;

public record KnowledgeEntry(
        String topicId,
        List<String> aliases,
        String title,
        String route,
        List<String> keywords,
        String content,
        String reviewStatus
) {
    public List<String> allTopicIds() {
        return java.util.stream.Stream.concat(java.util.stream.Stream.of(topicId), aliases.stream()).toList();
    }
}
