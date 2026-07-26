package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;

import com.ccb.custodytraining.casepractice.CaseAsset;
import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.casepractice.CaseDimension;
import com.ccb.custodytraining.casepractice.CasePoint;
import com.ccb.custodytraining.knowledge.KnowledgeCatalog;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class KnowledgeCatalogTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CaseCatalog caseCatalog = new CaseCatalog(objectMapper);
    private final KnowledgeCatalog catalog = new KnowledgeCatalog(objectMapper, caseCatalog);

    @Test
    void allCaseKnowledgeTopicIdsExist() {
        Set<String> publicTopicIds = catalog.publicTopics().stream()
                .map(KnowledgeCatalog.KnowledgeTopicDto::topicId).collect(java.util.stream.Collectors.toSet());
        for (CaseAsset asset : caseCatalog.findAll()) {
            for (CaseDimension dimension : CaseDimension.values()) {
                for (CasePoint point : asset.dimensions().get(dimension).points()) {
                    for (String topicId : point.knowledgeTopicIds()) {
                        assertTrue(publicTopicIds.contains(topicId),
                                "案例主题必须出现在 APPROVED 公开主题中：" + topicId);
                        assertTrue(catalog.containsTopicId(topicId),
                                "案例主题必须映射到 APPROVED 条目：" + topicId);
                    }
                }
            }
        }
    }

    @Test
    void pendingEntriesNeverParticipateButApprovedAliasIsSearchable() {
        assertFalse(catalog.containsTopicId("DEMO-PENDING-01"));
        assertTrue(catalog.publicTopics().stream()
                .noneMatch(topic -> topic.topicId().equals("DEMO-PENDING-01")));
        assertTrue(catalog.search("CLEARING-04").stream()
                .anyMatch(match -> match.matchedTopicId().equals("CLEARING-04")));
        assertTrue(catalog.search("差异分类").stream()
                .anyMatch(match -> match.entry().topicId().equals("CLEARING-03")));
        assertTrue(catalog.search("未审核演示内容").isEmpty());
    }

    @Test
    void retrievalIsStableAndUnknownQuestionIsEmpty() {
        List<String> first = catalog.search("请说明估值日期和估值数据如何核验").stream()
                .map(match -> match.matchedTopicId()).toList();
        List<String> second = catalog.search("请说明估值日期和估值数据如何核验").stream()
                .map(match -> match.matchedTopicId()).toList();
        assertEquals(first, second);
        assertFalse(first.isEmpty());
        assertTrue(catalog.search("火星航天器颜色与天气").isEmpty());
    }
}
