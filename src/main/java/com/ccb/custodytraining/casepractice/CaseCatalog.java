package com.ccb.custodytraining.casepractice;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.web.NotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

@Component
public class CaseCatalog {

    private static final String RESOURCE_PATTERN = "classpath*:cases/*.json";

    private final Map<String, CaseAsset> cases;

    public CaseCatalog(ObjectMapper objectMapper) {
        this.cases = loadCases(objectMapper);
    }

    public List<CaseAsset> findAll() {
        return cases.values().stream()
                .sorted(java.util.Comparator.comparing(CaseAsset::id))
                .toList();
    }

    public List<CaseAsset> findByLine(CaseLine line) {
        return findAll().stream().filter(asset -> asset.line() == line).toList();
    }

    public CaseAsset getRequired(String caseId) {
        CaseAsset asset = cases.get(caseId);
        if (asset == null) {
            throw new NotFoundException("案例不存在");
        }
        return asset;
    }

    private Map<String, CaseAsset> loadCases(ObjectMapper objectMapper) {
        Resource[] resources;
        try {
            resources = new PathMatchingResourcePatternResolver()
                    .getResources(RESOURCE_PATTERN);
        } catch (IOException exception) {
            throw new IllegalStateException("案例资产加载失败：无法读取案例资源", exception);
        }
        if (resources.length == 0) {
            throw new IllegalStateException("案例资产校验失败：未找到案例文件");
        }

        Map<String, CaseAsset> loaded = new java.util.LinkedHashMap<>();
        for (Resource resource : resources) {
            CaseAsset asset = parseAndValidate(resource, objectMapper);
            if (loaded.put(asset.id(), asset) != null) {
                throw invalid(asset.id(), "案例 ID 重复");
            }
        }
        return Map.copyOf(loaded);
    }

    private CaseAsset parseAndValidate(Resource resource, ObjectMapper objectMapper) {
        JsonNode root;
        String resourceName = resource.getFilename() == null ? "unknown" : resource.getFilename();
        try (InputStream inputStream = resource.getInputStream()) {
            root = objectMapper.readTree(inputStream);
        } catch (IOException | RuntimeException exception) {
            throw new IllegalStateException("案例资产校验失败：文件 " + resourceName + " 无法解析", exception);
        }

        String id = requiredText(root, "id", resourceName);
        String version = requiredText(root, "version", id);
        String rubricVersion = requiredText(root, "rubricVersion", id);
        boolean placeholder = requiredBoolean(root, "placeholder", id);
        CaseLine line = parseEnum(root, "line", CaseLine.class, id);
        String title = requiredText(root, "title", id);
        String summary = requiredText(root, "summary", id);
        String background = requiredText(root, "background", id);
        String difficulty = requiredText(root, "difficulty", id);
        int estimatedMinutes = requiredPositiveInt(root, "estimatedMinutes", id);
        String referenceAnswer = requiredText(root, "referenceAnswer", id);
        JsonNode tasksNode = requiredArray(root, "tasks", id);
        List<String> tasks = textArray(tasksNode, id + ".tasks", false);
        JsonNode dimensionsNode = root.get("dimensions");
        if (dimensionsNode == null || !dimensionsNode.isObject()) {
            throw invalid(id, "dimensions 必须是对象");
        }

        Map<CaseDimension, CaseDimensionAsset> dimensions = new EnumMap<>(CaseDimension.class);
        Set<String> pointIds = new HashSet<>();
        int total = 0;
        for (CaseDimension dimension : CaseDimension.values()) {
            JsonNode dimensionNode = dimensionsNode.get(dimension.name());
            if (dimensionNode == null || !dimensionNode.isObject()) {
                throw invalid(id, "缺少维度 " + dimension.name());
            }
            int maxScore = requiredPositiveInt(dimensionNode, "maxScore", id + "." + dimension.name());
            if (maxScore != dimension.maxScore()) {
                throw invalid(id, dimension.name() + " 满分必须为 " + dimension.maxScore());
            }
            JsonNode pointsNode = requiredArray(dimensionNode, "points", id + "." + dimension.name());
            List<CasePoint> points = new ArrayList<>();
            int dimensionTotal = 0;
            for (JsonNode pointNode : pointsNode) {
                String pointId = requiredText(pointNode, "pointId", id);
                if (!pointIds.add(pointId)) {
                    throw invalid(id, "得分点 ID 重复");
                }
                String description = requiredText(pointNode, "description", id);
                int weight = requiredPositiveInt(pointNode, "weight", pointId);
                List<String> keywords = textArray(requiredArray(pointNode, "keywords", pointId),
                        pointId + ".keywords", true);
                List<String> topicIds = textArray(requiredArray(pointNode, "knowledgeTopicIds", pointId),
                        pointId + ".knowledgeTopicIds", true);
                dimensionTotal += weight;
                points.add(new CasePoint(pointId, description, weight, keywords, topicIds));
            }
            if (dimensionTotal != maxScore) {
                throw invalid(id, dimension.name() + " 得分点权重之和必须为 " + maxScore);
            }
            dimensions.put(dimension, new CaseDimensionAsset(dimension, maxScore, List.copyOf(points)));
            total += dimensionTotal;
        }
        if (total != 100) {
            throw invalid(id, "四维总分必须为 100");
        }
        if (dimensionsNode.size() != CaseDimension.values().length) {
            throw invalid(id, "只允许存在四个固定评分维度");
        }
        return new CaseAsset(id, version, rubricVersion, placeholder, line, title, summary,
                background, List.copyOf(tasks), difficulty, estimatedMinutes, referenceAnswer,
                Map.copyOf(dimensions));
    }

    private static JsonNode requiredArray(JsonNode node, String field, String owner) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isArray() || value.isEmpty()) {
            throw invalid(owner, field + " 必须是非空数组");
        }
        return value;
    }

    private static String requiredText(JsonNode node, String field, String owner) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isTextual() || value.textValue().trim().isEmpty()) {
            throw invalid(owner, field + " 必须是非空字符串");
        }
        return value.textValue().trim();
    }

    private static boolean requiredBoolean(JsonNode node, String field, String owner) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isBoolean()) {
            throw invalid(owner, field + " 必须是布尔值");
        }
        return value.booleanValue();
    }

    private static int requiredPositiveInt(JsonNode node, String field, String owner) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.canConvertToInt() || value.intValue() <= 0) {
            throw invalid(owner, field + " 必须是正整数");
        }
        return value.intValue();
    }

    private static List<String> textArray(JsonNode array, String owner, boolean nonEmpty) {
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
        return List.copyOf(values);
    }

    private static <T extends Enum<T>> T parseEnum(JsonNode node, String field, Class<T> type, String owner) {
        String value = requiredText(node, field, owner);
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException exception) {
            throw invalid(owner, field + " 不是允许的枚举值");
        }
    }

    private static IllegalStateException invalid(String owner, String detail) {
        return new IllegalStateException("案例资产校验失败：" + owner + "，" + detail);
    }
}
