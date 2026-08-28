package com.ccb.custodytraining.learning;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.web.NotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class FormalContentCatalog {

    private static final String RELEASE = "formal/releases/CUSTODY_2026.08.12.json";

    private final ObjectMapper objectMapper;
    private final JsonNode release;
    private final JsonNode map;
    private final Map<String, RouteBundle> routes;

    public FormalContentCatalog(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.release = read(RELEASE);
        this.map = read("formal/" + requiredText(release.path("map"), "path"));
        this.routes = loadRoutes();
        validate();
    }

    public JsonNode release() {
        return release.deepCopy();
    }

    public JsonNode map() {
        return map.deepCopy();
    }

    public RouteBundle route(String routeId) {
        RouteBundle route = routes.get(routeId);
        if (route == null) {
            throw new NotFoundException("路线不存在");
        }
        return route;
    }

    public boolean isPublished(String routeId) {
        return routes.containsKey(routeId);
    }

    public List<String> publishedRouteIds() {
        return List.copyOf(routes.keySet());
    }

    public RouteMapEntry routeMapEntry(String routeId) {
        for (JsonNode line : map.path("lines")) {
            for (JsonNode region : line.path("regions")) {
                for (JsonNode module : region.path("modules")) {
                    for (JsonNode node : module.path("nodes")) {
                        if (routeId.equals(node.path("routeId").asText())) {
                            String title = node.path("title").asText(route(routeId).content().path("title").asText());
                            String path = String.join(" / ",
                                    line.path("name").asText(),
                                    region.path("name").asText(),
                                    module.path("name").asText(),
                                    title);
                            return new RouteMapEntry(path, title);
                        }
                    }
                }
            }
        }
        throw new NotFoundException("路线地图节点不存在");
    }

    public JsonNode publicStep(String routeId, LearningTypes.StepType stepType) {
        JsonNode step = route(routeId).content().path("steps").path(stepType.name()).deepCopy();
        if (stepType == LearningTypes.StepType.BASIC_PRACTICE) {
            for (JsonNode question : step.path("questions")) {
                if (question instanceof ObjectNode object) {
                    object.remove(List.of("answer", "explanation", "hints"));
                }
            }
        }
        return step;
    }

    public JsonNode publicRouteMetadata(String routeId) {
        JsonNode content = route(routeId).content();
        ObjectNode result = objectMapper.createObjectNode();
        for (String field : List.of("routeId", "contentVersion", "line", "estimatedMinutes")) {
            result.set(field, content.path(field).deepCopy());
        }
        result.put("title", HumanFeedbackText.publicDisplayText(content.path("title").asText("")));
        result.put("summary", HumanFeedbackText.publicDisplayText(content.path("summary").asText("")));
        ArrayNode objectives = result.putArray("objectives");
        for (JsonNode objective : content.path("objectives")) {
            objectives.add(HumanFeedbackText.publicDisplayText(objective.asText("")));
        }
        return result;
    }

    public JsonNode question(String routeId, String questionId) {
        for (JsonNode question : route(routeId).content().path("steps")
                .path("BASIC_PRACTICE").path("questions")) {
            if (questionId.equals(question.path("questionId").asText())) {
                return question;
            }
        }
        throw new NotFoundException("基础练习题不存在");
    }

    public JsonNode remediationTarget(String routeId, String targetId) {
        for (JsonNode target : route(routeId).rubric().path("remediationTargets")) {
            if (targetId.equals(target.path("targetId").asText())) {
                return target;
            }
        }
        throw new NotFoundException("补学目标不存在");
    }

    private Map<String, RouteBundle> loadRoutes() {
        Map<String, RouteBundle> result = new HashMap<>();
        for (JsonNode item : release.path("routes")) {
            String routeId = requiredText(item, "routeId");
            JsonNode content = read("formal/" + requiredText(item, "contentPath"));
            JsonNode rubric = read("formal/" + requiredText(item, "rubricPath"));
            result.put(routeId, new RouteBundle(content, rubric));
        }
        return Map.copyOf(result);
    }

    private void validate() {
        if (!"CUSTODY_LEARNING_MAP".equals(map.path("mapId").asText())) {
            throw new IllegalStateException("正式地图标识无效");
        }
        Set<String> lines = new HashSet<>();
        Set<String> nodeIds = new HashSet<>();
        for (JsonNode line : map.path("lines")) {
            lines.add(requiredText(line, "line"));
            for (JsonNode region : line.path("regions")) {
                for (JsonNode module : region.path("modules")) {
                    for (JsonNode node : module.path("nodes")) {
                        if (!nodeIds.add(requiredText(node, "nodeId"))) {
                            throw new IllegalStateException("地图节点 ID 重复");
                        }
                    }
                }
            }
        }
        if (!lines.equals(Set.of("CLEARING", "ACCOUNTING", "SUPERVISION"))) {
            throw new IllegalStateException("正式地图必须包含三条线");
        }
        for (RouteBundle bundle : routes.values()) {
            JsonNode content = bundle.content();
            JsonNode rubric = bundle.rubric();
            String routeId = requiredText(content, "routeId");
            if (!routeId.equals(requiredText(rubric, "routeId"))) {
                throw new IllegalStateException("路线与 Rubric 标识不一致");
            }
            for (LearningTypes.StepType type : LearningTypes.StepType.values()) {
                if (!content.path("steps").has(type.name())) {
                    throw new IllegalStateException("路线缺少学习环节 " + type);
                }
            }
            Map<String, Integer> expected = Map.of(
                    "CONCEPT", 25, "PROCESS", 30, "RISK", 25, "EXPRESSION", 20);
            int total = 0;
            Set<String> criterionIds = new HashSet<>();
            Set<String> remediationIds = new HashSet<>();
            for (JsonNode target : rubric.path("remediationTargets")) {
                remediationIds.add(requiredText(target, "targetId"));
            }
            for (JsonNode dimension : rubric.path("dimensions")) {
                String name = requiredText(dimension, "dimension");
                int dimensionTotal = 0;
                for (JsonNode criterion : dimension.path("criteria")) {
                    criterionIds.add(requiredText(criterion, "criterionId"));
                    dimensionTotal += criterion.path("weight").asInt(-1);
                    if (!remediationIds.contains(requiredText(criterion, "remediationTargetId"))) {
                        throw new IllegalStateException("评分项缺少有效补学映射");
                    }
                }
                if (dimensionTotal != expected.getOrDefault(name, -1)
                        || dimension.path("maxScore").asInt() != dimensionTotal) {
                    throw new IllegalStateException("四维评分权重无效");
                }
                total += dimensionTotal;
            }
            if (total != 100 || rubric.path("passScore").asInt() != 75
                    || rubric.path("mandatoryRequirements").size() < 1
                    || rubric.path("mandatoryRequirements").size() > 2) {
                throw new IllegalStateException("Rubric 总分、通过线或硬性必达项无效");
            }
            for (JsonNode mandatory : rubric.path("mandatoryRequirements")) {
                if (!remediationIds.contains(requiredText(mandatory, "remediationTargetId"))) {
                    throw new IllegalStateException("硬性必达项缺少有效补学映射");
                }
            }
        }
    }

    private JsonNode read(String path) {
        ClassPathResource resource = new ClassPathResource(path);
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readTree(input);
        } catch (IOException exception) {
            throw new IllegalStateException("无法读取正式内容资产: " + path, exception);
        }
    }

    private static String requiredText(JsonNode node, String field) {
        String value = node.path(field).asText("").trim();
        if (value.isEmpty()) {
            throw new IllegalStateException("正式内容字段缺失: " + field);
        }
        return value;
    }

    public record RouteBundle(JsonNode content, JsonNode rubric) {

        public String routeId() {
            return content.path("routeId").asText();
        }

        public String contentVersion() {
            return content.path("contentVersion").asText();
        }

        public String rubricVersion() {
            return rubric.path("rubricVersion").asText();
        }
    }

    public record RouteMapEntry(String path, String title) {
    }
}
