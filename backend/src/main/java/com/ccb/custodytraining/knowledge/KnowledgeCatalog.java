package com.ccb.custodytraining.knowledge;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.casepractice.CaseAsset;
import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.casepractice.CaseDimension;
import com.ccb.custodytraining.casepractice.CasePoint;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

@Component
public class KnowledgeCatalog {

    private static final String RESOURCE_PATTERN = "classpath*:knowledge/*.json";
    private static final String APPROVED = "APPROVED";
    private static final int MAX_RESULTS = 3;
    private static final Set<String> WEAK_TERMS = Set.of("演示", "占位", "审核", "内容");

    private final List<KnowledgeEntry> allEntries;
    private final List<KnowledgeEntry> approvedEntries;
    private final Map<String, KnowledgeEntry> approvedByTopicId;

    public KnowledgeCatalog(ObjectMapper objectMapper, CaseCatalog caseCatalog) {
        this.allEntries = loadEntries(objectMapper);
        indexEntries(allEntries);
        this.approvedEntries = allEntries.stream()
                .filter(entry -> APPROVED.equals(entry.reviewStatus()))
                .toList();
        this.approvedByTopicId = indexEntries(approvedEntries);
        validateCaseTopicReferences(caseCatalog);
    }

    public List<KnowledgeTopicDto> publicTopics() {
        List<KnowledgeTopicDto> topics = new ArrayList<>();
        for (KnowledgeEntry entry : approvedEntries) {
            for (String topicId : entry.allTopicIds()) {
                topics.add(new KnowledgeTopicDto(topicId, entry.title(), entry.route()));
            }
        }
        return topics.stream().sorted(Comparator.comparing(KnowledgeTopicDto::topicId)).toList();
    }

    public List<KnowledgeMatch> search(String question) {
        String normalizedQuestion = normalize(question);
        List<String> queryTerms = terms(normalizedQuestion);
        if (normalizedQuestion.isBlank() || queryTerms.isEmpty()) {
            return List.of();
        }

        List<KnowledgeMatch> matches = new ArrayList<>();
        for (KnowledgeEntry entry : approvedEntries) {
            KnowledgeMatch match = score(entry, normalizedQuestion, queryTerms);
            if (match != null) {
                matches.add(match);
            }
        }
        return matches.stream()
                .sorted(Comparator.comparingInt(KnowledgeMatch::score).reversed()
                        .thenComparing(KnowledgeMatch::matchedTopicId)
                        .thenComparing(match -> match.entry().title()))
                .limit(MAX_RESULTS)
                .toList();
    }

    public boolean containsTopicId(String topicId) {
        return approvedByTopicId.containsKey(topicId);
    }

    public List<KnowledgeEntry> allEntries() {
        return allEntries;
    }

    private KnowledgeMatch score(KnowledgeEntry entry, String question, List<String> queryTerms) {
        int bestScore = 0;
        String matchedTopicId = entry.topicId();
        for (String topicId : entry.allTopicIds()) {
            String normalizedTopicId = normalize(topicId);
            if (question.contains(normalizedTopicId)) {
                int score = 1000 + normalizedTopicId.length();
                if (score > bestScore) {
                    bestScore = score;
                    matchedTopicId = topicId;
                }
            }
        }

        String normalizedTitle = normalize(entry.title());
        String normalizedKeywords = normalize(String.join(" ", entry.keywords()));
        String normalizedContent = normalize(entry.content());
        for (String term : queryTerms) {
            if (term.length() < 2 || WEAK_TERMS.contains(term)) {
                continue;
            }
            if (normalizedTitle.contains(term)) {
                bestScore += 30;
            }
            if (normalizedKeywords.contains(term)) {
                bestScore += 20;
            }
            if (normalizedContent.contains(term)) {
                bestScore += 5;
            }
        }
        return bestScore < 10 ? null : new KnowledgeMatch(entry, matchedTopicId, bestScore);
    }

    private List<KnowledgeEntry> loadEntries(ObjectMapper objectMapper) {
        Resource[] resources;
        try {
            resources = new PathMatchingResourcePatternResolver().getResources(RESOURCE_PATTERN);
        } catch (IOException exception) {
            throw new IllegalStateException("知识资产加载失败：无法读取知识资源", exception);
        }
        if (resources.length == 0) {
            throw new IllegalStateException("知识资产校验失败：未找到知识文件");
        }

        List<KnowledgeEntry> loaded = new ArrayList<>();
        for (Resource resource : resources) {
            String resourceName = resource.getFilename() == null ? "unknown" : resource.getFilename();
            try (InputStream inputStream = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(inputStream);
                JsonNode topics = root == null ? null : root.get("topics");
                if (topics == null || !topics.isArray() || topics.isEmpty()) {
                    throw invalid(resourceName, "topics 必须是非空数组");
                }
                for (JsonNode topic : topics) {
                    loaded.add(parseEntry(topic, resourceName));
                }
            } catch (IOException | RuntimeException exception) {
                if (exception instanceof IllegalStateException stateException) {
                    throw stateException;
                }
                throw new IllegalStateException("知识资产校验失败：文件 " + resourceName + " 无法解析", exception);
            }
        }
        if (loaded.isEmpty() || loaded.size() > 1000) {
            throw new IllegalStateException("知识资产校验失败：条目数量无效");
        }
        return List.copyOf(loaded);
    }

    private KnowledgeEntry parseEntry(JsonNode node, String owner) {
        String topicId = requiredText(node, "topicId", owner);
        List<String> aliases = textArray(node.get("aliases"), owner + "." + topicId + ".aliases", false);
        String title = requiredText(node, "title", topicId);
        String route = requiredText(node, "route", topicId);
        List<String> keywords = textArray(node.get("keywords"), topicId + ".keywords", true);
        String content = requiredText(node, "content", topicId);
        String reviewStatus = requiredText(node, "reviewStatus", topicId).toUpperCase(Locale.ROOT);
        if (!APPROVED.equals(reviewStatus) && !"PENDING".equals(reviewStatus)) {
            throw invalid(topicId, "reviewStatus 只能为 APPROVED 或 PENDING");
        }
        List<String> ids = new ArrayList<>();
        ids.add(topicId);
        ids.addAll(aliases);
        Set<String> uniqueIds = new HashSet<>();
        for (String id : ids) {
            if (!id.matches("[A-Z][A-Z0-9-]{2,63}")) {
                throw invalid(topicId, "topicId 格式无效");
            }
            if (!uniqueIds.add(id)) {
                throw invalid(topicId, "topicId 或 aliases 重复");
            }
        }
        if (content.length() > 4000) {
            throw invalid(topicId, "正文不能超过 4000 个字符");
        }
        return new KnowledgeEntry(topicId, List.copyOf(aliases), title, route,
                List.copyOf(keywords), content, reviewStatus);
    }

    private Map<String, KnowledgeEntry> indexEntries(List<KnowledgeEntry> entries) {
        Map<String, KnowledgeEntry> indexed = new LinkedHashMap<>();
        for (KnowledgeEntry entry : entries) {
            for (String topicId : entry.allTopicIds()) {
                if (indexed.put(topicId, entry) != null) {
                    throw invalid(topicId, "topicId 在知识资产中重复");
                }
            }
        }
        return Map.copyOf(indexed);
    }

    private void validateCaseTopicReferences(CaseCatalog caseCatalog) {
        Set<String> referenced = new LinkedHashSet<>();
        for (CaseAsset asset : caseCatalog.findAll()) {
            for (CaseDimension dimension : CaseDimension.values()) {
                for (CasePoint point : asset.dimensions().get(dimension).points()) {
                    referenced.addAll(point.knowledgeTopicIds());
                }
            }
        }
        List<String> missing = referenced.stream().filter(id -> !approvedByTopicId.containsKey(id)).toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("知识资产校验失败：案例引用的主题未映射到 APPROVED 条目 " + missing);
        }
    }

    private static List<String> textArray(JsonNode array, String owner, boolean nonEmpty) {
        if (array == null || !array.isArray()) {
            throw invalid(owner, "必须是数组");
        }
        List<String> values = new ArrayList<>();
        for (JsonNode value : array) {
            if (!value.isTextual() || value.textValue().trim().isEmpty()) {
                throw invalid(owner, "必须只包含非空字符串");
            }
            values.add(value.textValue().trim());
        }
        if (nonEmpty && values.isEmpty()) {
            throw invalid(owner, "不能为空");
        }
        return values;
    }

    private static String requiredText(JsonNode node, String field, String owner) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isTextual() || value.textValue().trim().isEmpty()) {
            throw invalid(owner, field + " 必须是非空字符串");
        }
        return value.textValue().trim();
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT).trim();
    }

    private static List<String> terms(String value) {
        List<String> result = new ArrayList<>();
        StringBuilder run = new StringBuilder();
        for (int offset = 0; offset < value.length();) {
            int codePoint = value.codePointAt(offset);
            offset += Character.charCount(codePoint);
            boolean usable = Character.isLetterOrDigit(codePoint)
                    || Character.UnicodeScript.of(codePoint) == Character.UnicodeScript.HAN;
            if (!usable) {
                addRunTerms(run, result);
                run.setLength(0);
            } else {
                run.appendCodePoint(codePoint);
            }
        }
        addRunTerms(run, result);
        return result.stream().distinct().toList();
    }

    private static void addRunTerms(StringBuilder run, List<String> result) {
        if (run.isEmpty()) {
            return;
        }
        String text = run.toString();
        result.add(text);
        int[] codePoints = text.codePoints().toArray();
        for (int i = 0; i < codePoints.length; i++) {
            result.add(new String(Character.toChars(codePoints[i])));
            if (i + 1 < codePoints.length) {
                result.add(new String(Character.toChars(codePoints[i]))
                        + new String(Character.toChars(codePoints[i + 1])));
            }
        }
    }

    private static IllegalStateException invalid(String owner, String detail) {
        return new IllegalStateException("知识资产校验失败：" + owner + "，" + detail);
    }

    public record KnowledgeTopicDto(String topicId, String title, String route) {
    }
}
