package com.ccb.custodytraining.learning;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.learning.FormalContentCatalog.RouteBundle;
import com.ccb.custodytraining.learning.LearningTypes.Conclusion;
import com.ccb.custodytraining.learning.LearningTypes.ProcessingStatus;
import com.ccb.custodytraining.learning.LearningTypes.RouteState;
import com.ccb.custodytraining.learning.LearningTypes.StepType;
import com.ccb.custodytraining.web.BadRequestException;
import com.ccb.custodytraining.web.BusinessConflictException;
import com.ccb.custodytraining.web.IdempotencyConflictException;
import com.ccb.custodytraining.web.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class LearningService {

    private final FormalContentCatalog catalog;
    private final LearningRepository repository;
    private final ScoringDispatcher scoringDispatcher;
    private final ObjectMapper objectMapper;

    public LearningService(FormalContentCatalog catalog, LearningRepository repository,
                           ScoringDispatcher scoringDispatcher, ObjectMapper objectMapper) {
        this.catalog = catalog;
        this.repository = repository;
        this.scoringDispatcher = scoringDispatcher;
        this.objectMapper = objectMapper;
    }

    public ObjectNode worlds(long userId) {
        ObjectNode response = objectMapper.createObjectNode();
        response.put("mapVersion", catalog.map().path("version").asText());
        ArrayNode worlds = response.putArray("worlds");
        List<String> requiredRouteIds = publishedRequiredRouteIds();
        for (JsonNode line : catalog.map().path("lines")) {
            ObjectNode world = worlds.addObject();
            world.put("line", line.path("line").asText());
            world.put("name", line.path("name").asText());
            world.put("description", line.path("description").asText());
            world.put("availability", line.path("availability").asText());
            world.put("sceneAssetId", line.path("sceneAssetId").asText());
            int total = "ACCOUNTING".equals(line.path("line").asText())
                    ? requiredRouteIds.size() : 0;
            int passed = "ACCOUNTING".equals(line.path("line").asText())
                    ? (int) requiredRouteIds.stream()
                    .filter(routeId -> repository.hasPassed(userId, routeId)).count() : 0;
            boolean hasActivity = "ACCOUNTING".equals(line.path("line").asText())
                    && catalog.publishedRouteIds().stream()
                    .map(routeId -> state(userId, routeId))
                    .anyMatch(routeState -> routeState != RouteState.NOT_STARTED);
            world.put("passedRequiredRoutes", passed);
            world.put("publishedRequiredRoutes", total);
            world.put("progressPercent", total == 0 ? 0 : passed * 100 / total);
            world.put("status", worldStatus(
                    line.path("availability").asText(), passed, total, hasActivity));
        }
        return response;
    }

    public ObjectNode map(long userId, String lineName) {
        if (!"ACCOUNTING".equals(lineName)) {
            JsonNode line = findLine(lineName);
            if (!"OPEN".equals(line.path("availability").asText())) {
                throw new BusinessConflictException("CONTENT_BUILDING", "该学习世界内容建设中");
            }
        }
        JsonNode line = findLine(lineName);
        ObjectNode response = objectMapper.createObjectNode();
        response.put("line", line.path("line").asText());
        response.put("name", line.path("name").asText());
        response.put("mapVersion", catalog.map().path("version").asText());
        ArrayNode regions = response.putArray("regions");
        String recommended = null;
        int passedCount = 0;
        for (JsonNode region : line.path("regions")) {
            ObjectNode regionOut = regions.addObject();
            regionOut.put("regionId", region.path("regionId").asText());
            regionOut.put("name", region.path("name").asText());
            regionOut.put("description", region.path("description").asText());
            ArrayNode modules = regionOut.putArray("modules");
            for (JsonNode module : region.path("modules")) {
                ObjectNode moduleOut = modules.addObject();
                moduleOut.put("moduleId", module.path("moduleId").asText());
                moduleOut.put("name", module.path("name").asText());
                ArrayNode nodes = moduleOut.putArray("nodes");
                for (JsonNode node : module.path("nodes")) {
                    String routeId = node.path("routeId").asText();
                    boolean unlocked = prerequisitesPassed(userId, line, node);
                    RouteState state = unlocked ? state(userId, routeId) : RouteState.LOCKED;
                    if (state == RouteState.PASSED && catalog.isPublished(routeId)
                            && "REQUIRED".equals(node.path("pathType").asText())) {
                        passedCount++;
                    }
                    if (recommended == null && unlocked && catalog.isPublished(routeId)
                            && state != RouteState.PASSED) {
                        recommended = node.path("nodeId").asText();
                    }
                    ObjectNode nodeOut = nodes.addObject();
                    nodeOut.put("nodeId", node.path("nodeId").asText());
                    nodeOut.put("nodeType", node.path("nodeType").asText());
                    nodeOut.put("routeId", routeId);
                    nodeOut.put("title", node.path("title").asText());
                    nodeOut.put("pathType", node.path("pathType").asText());
                    nodeOut.put("position", node.path("position").asText());
                    nodeOut.put("state", state.name());
                    nodeOut.put("locked", !unlocked);
                    nodeOut.put("contentAvailability", node.path("contentAvailability").asText());
                    nodeOut.put("enterable", unlocked && catalog.isPublished(routeId));
                    nodeOut.put("completedSteps", catalog.isPublished(routeId)
                            ? completedStepCount(userId, routeId) : 0);
                    nodeOut.put("totalSteps", 4);
                    nodeOut.set("prerequisiteNodeIds", node.path("prerequisiteNodeIds").deepCopy());
                }
            }
        }
        if (recommended == null && !regions.isEmpty()) {
            recommended = regions.path(0).path("modules").path(0)
                    .path("nodes").path(0).path("nodeId").asText(null);
        }
        response.put("recommendedNodeId", recommended);
        ObjectNode progress = response.putObject("progress");
        int total = publishedRequiredRouteIds().size();
        progress.put("passedRequiredRoutes", passedCount);
        progress.put("publishedRequiredRoutes", total);
        progress.put("percent", total == 0 ? 0 : passedCount * 100 / total);
        return response;
    }

    public ObjectNode routeOverview(long userId, String routeId) {
        RouteBundle route = catalog.route(routeId);
        boolean unlocked = routeUnlocked(userId, routeId);
        ObjectNode response = (ObjectNode) catalog.publicRouteMetadata(routeId);
        response.put("rubricVersion", route.rubricVersion());
        response.put("state", unlocked ? state(userId, routeId).name() : RouteState.LOCKED.name());
        response.put("enterable", unlocked);
        ArrayNode steps = response.putArray("steps");
        StepType next = unlocked ? nextStep(userId, route) : null;
        for (StepType type : StepType.values()) {
            ObjectNode step = steps.addObject();
            step.put("stepType", type.name());
            step.put("completed", isStepComplete(userId, route, type));
            step.put("accessible", canAccessStep(userId, route, type));
        }
        response.put("nextStep", next == null ? null : next.name());
        response.put("completedSteps", completedStepCount(userId, routeId));
        response.put("totalSteps", 4);
        return response;
    }

    public ObjectNode step(long userId, String routeId, StepType type) {
        RouteBundle route = catalog.route(routeId);
        if (!canAccessStep(userId, route, type)) {
            throw new BusinessConflictException("LEARNING_SEQUENCE_VIOLATION",
                    "请先完成前置学习环节");
        }
        if (type == StepType.COMPREHENSIVE_PRACTICE && remediationBlocksRetry(userId, routeId)) {
            throw new BusinessConflictException("REMEDIATION_REQUIRED",
                    "请先完成本次定向补学，再重新完成综合实务");
        }
        ObjectNode response = objectMapper.createObjectNode();
        response.put("routeId", routeId);
        response.put("contentVersion", route.contentVersion());
        response.put("stepType", type.name());
        response.set("content", catalog.publicStep(routeId, type));
        response.put("completed", isStepComplete(userId, route, type));
        return response;
    }

    public ObjectNode completeStep(long userId, String routeId, StepType type,
                                   String contentVersion) {
        if (type != StepType.KNOWLEDGE_CARD && type != StepType.DEMONSTRATION) {
            throw new BadRequestException("该环节不能通过完成事件直接完成");
        }
        RouteBundle route = requireVersion(routeId, contentVersion);
        if (!canAccessStep(userId, route, type)) {
            throw new BusinessConflictException("LEARNING_SEQUENCE_VIOLATION",
                    "请先完成前置学习环节");
        }
        repository.completeStep(userId, routeId, route.contentVersion(), type.name());
        return progressResponse(userId, routeId);
    }

    public ObjectNode answerBasicQuestion(long userId, String routeId, String questionId,
                                          String contentVersion, List<String> answer) {
        RouteBundle route = requireVersion(routeId, contentVersion);
        if (!canAccessStep(userId, route, StepType.BASIC_PRACTICE)) {
            throw new BusinessConflictException("LEARNING_SEQUENCE_VIOLATION",
                    "请先完成正常示范");
        }
        JsonNode question = catalog.question(routeId, questionId);
        boolean correct = answerMatches(question, answer);
        repository.recordQuestion(userId, routeId, route.contentVersion(), questionId, correct);
        int totalQuestions = route.content().path("steps").path("BASIC_PRACTICE")
                .path("questions").size();
        int correctCount = repository.correctQuestionCount(
                userId, routeId, route.contentVersion());
        if (correctCount == totalQuestions) {
            repository.completeStep(userId, routeId, route.contentVersion(),
                    StepType.BASIC_PRACTICE.name());
        }
        ObjectNode response = objectMapper.createObjectNode();
        response.put("questionId", questionId);
        response.put("correct", correct);
        response.put("correctOnce", repository.isQuestionCorrect(
                userId, routeId, route.contentVersion(), questionId));
        response.put("explanation", feedbackExplanation(question, correct));
        if (!correct && question.path("hints").isArray() && !question.path("hints").isEmpty()) {
            response.put("hint", feedbackHint(question));
        }
        response.put("practiceCompleted", correctCount == totalQuestions);
        response.set("progress", progressResponse(userId, routeId));
        return response;
    }

    public ObjectNode draft(long userId, String routeId) {
        catalog.route(routeId);
        LearningRepository.Draft draft = repository.findDraft(userId, routeId).orElse(null);
        ObjectNode response = objectMapper.createObjectNode();
        response.put("routeId", routeId);
        if (draft == null) {
            response.set("answer", objectMapper.createObjectNode().set("responses", objectMapper.createObjectNode()));
            response.put("revision", 0);
            response.putNull("updatedAt");
        } else {
            response.set("answer", read(draft.answer()));
            response.put("revision", draft.revision());
            response.put("updatedAt", draft.updatedAt().toString());
        }
        return response;
    }

    public ObjectNode saveDraft(long userId, String routeId, String contentVersion,
                                String answer, Long expectedRevision) {
        RouteBundle route = requireVersion(routeId, contentVersion);
        if (!canAccessStep(userId, route, StepType.COMPREHENSIVE_PRACTICE)) {
            throw new BusinessConflictException("LEARNING_SEQUENCE_VIOLATION",
                    "请先完成基础练习");
        }
        if (answer.length() > 50000) {
            throw new BadRequestException("综合实务草稿不得超过 50000 个字符");
        }
        LearningRepository.Draft existing = repository.findDraft(userId, routeId).orElse(null);
        long actualRevision = existing == null ? 0 : existing.revision();
        if (expectedRevision != null && expectedRevision != actualRevision) {
            throw new BusinessConflictException("DRAFT_CONFLICT", "草稿已在其他请求中更新");
        }
        LearningRepository.Draft saved = repository.saveDraft(
                userId, routeId, route.contentVersion(), answer);
        ObjectNode response = objectMapper.createObjectNode();
        response.put("routeId", saved.routeId());
        response.put("contentVersion", saved.contentVersion());
        response.put("revision", saved.revision());
        response.put("updatedAt", saved.updatedAt().toString());
        return response;
    }

    public ObjectNode submit(long userId, String callerExternalId, String routeId,
                             String contentVersion, String rubricVersion,
                             String clientRequestId, String answer) {
        RouteBundle route = requireVersion(routeId, contentVersion);
        if (!route.rubricVersion().equals(rubricVersion)) {
            throw new BusinessConflictException("CONTENT_VERSION_MISMATCH",
                    "评分规则版本已变化，请刷新后重试");
        }
        String normalized = answer == null ? "" : answer.trim();
        if (normalized.isEmpty() || normalized.length() > 50000
                || !read(normalized).path("responses").isObject()) {
            throw new BadRequestException("综合实务正式答案格式无效");
        }
        LearningRepository.Attempt existing = repository
                .findAttemptByRequest(userId, clientRequestId).orElse(null);
        if (existing != null) {
            if (!existing.routeId().equals(routeId) || !existing.answer().equals(normalized)
                    || !existing.contentVersion().equals(contentVersion)
                    || !existing.rubricVersion().equals(rubricVersion)) {
                throw new IdempotencyConflictException("该请求标识已对应另一份正式提交");
            }
            return attempt(userId, existing.id());
        }
        ensureSubmissionAllowed(userId, route);
        LearningRepository.Attempt created;
        try {
            created = repository.insertAttempt(userId, routeId, clientRequestId, normalized,
                    route.contentVersion(), route.rubricVersion(),
                    write(route.content()), write(route.rubric()));
        } catch (DuplicateKeyException exception) {
            LearningRepository.Attempt concurrent = repository
                    .findAttemptByRequest(userId, clientRequestId)
                    .orElseThrow(() -> new IdempotencyConflictException("请求正在处理中"));
            if (!concurrent.routeId().equals(routeId) || !concurrent.answer().equals(normalized)) {
                throw new IdempotencyConflictException("该请求标识已对应另一份正式提交");
            }
            return attempt(userId, concurrent.id());
        }
        repository.markDraftSubmitted(userId, routeId, created.id());
        dispatchScoring(created.id(), callerExternalId);
        return attempt(userId, created.id());
    }

    public ObjectNode attempt(long userId, long attemptId) {
        LearningRepository.Attempt attempt = repository.findAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("正式作答不存在"));
        ObjectNode response = objectMapper.createObjectNode();
        response.put("attemptId", attempt.id());
        response.put("routeId", attempt.routeId());
        response.put("processingStatus", attempt.processingStatus());
        response.put("submittedAt", attempt.submittedAt().toString());
        response.put("contentVersion", attempt.contentVersion());
        response.put("rubricVersion", attempt.rubricVersion());
        if (ProcessingStatus.FAILED.name().equals(attempt.processingStatus())) {
            response.put("technicalErrorCode", attempt.technicalErrorCode());
            response.putArray("allowedActions").add("RETRY_SCORING");
            return response;
        }
        if (ProcessingStatus.SCORING.name().equals(attempt.processingStatus())) {
            response.putArray("allowedActions").add("POLL");
            return response;
        }
        LearningRepository.ResultSnapshot snapshot = repository.result(attemptId)
                .orElseThrow(() -> new IllegalStateException("评分结果快照缺失"));
        response.set("result", publicScoringResult(read(snapshot.json())));
        response.set("answerSnapshot", read(attempt.answer()));
        response.put("historicalConclusion", attempt.conclusion());
        response.put("currentRouteState", state(userId, attempt.routeId()).name());
        ArrayNode actions = response.putArray("allowedActions");
        if (Conclusion.PASSED.name().equals(attempt.conclusion())) {
            actions.add("RETURN_TO_MAP").add("REVIEW_ROUTE");
        } else {
            LearningRepository.Plan plan = repository.planByAttempt(userId, attemptId)
                    .orElseThrow(() -> new IllegalStateException("补学计划快照缺失"));
            response.set("remediationSummary", planSummary(plan));
            actions.add(repository.planComplete(plan.id()) ? "RETRY_COMPREHENSIVE_PRACTICE" : "START_REMEDIATION");
        }
        return response;
    }

    public ObjectNode retryScoring(long userId, String callerExternalId, long attemptId) {
        LearningRepository.Attempt attempt = repository.findAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("正式作答不存在"));
        if (!ProcessingStatus.FAILED.name().equals(attempt.processingStatus())) {
            throw new BusinessConflictException("SCORING_RETRY_NOT_ALLOWED",
                    "只有技术评分失败的正式作答可以重试评分");
        }
        if (!repository.claimFailedScoringRetry(attemptId)) {
            throw new BusinessConflictException("SCORING_RETRY_NOT_ALLOWED",
                    "该正式作答已经开始重试评分");
        }
        dispatchScoring(attemptId, callerExternalId);
        return attempt(userId, attemptId);
    }

    public ObjectNode remediation(long userId, long attemptId) {
        LearningRepository.Attempt attempt = repository.findAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("正式作答不存在"));
        LearningRepository.Plan plan = repository.planByAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("该正式作答没有补学计划"));
        ObjectNode response = planSummary(plan);
        ArrayNode targets = response.putArray("targets");
        JsonNode contentSnapshot = read(attempt.contentSnapshotJson());
        for (LearningRepository.Target target : repository.targets(plan.id())) {
            JsonNode targetData = read(target.snapshotJson());
            ObjectNode targetOut = targets.addObject();
            targetOut.setAll((ObjectNode) targetData.deepCopy());
            targetOut.put("completed", target.completed());
            String questionId = targetData.path("questionId").asText();
            targetOut.set("practice", publicQuestion(findQuestion(contentSnapshot, questionId)));
        }
        return response;
    }

    public ObjectNode answerRemediation(long userId, long attemptId, String targetId,
                                        List<String> answer) {
        LearningRepository.Attempt attempt = repository.findAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("正式作答不存在"));
        LearningRepository.Plan plan = repository.planByAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("该正式作答没有补学计划"));
        LearningRepository.Target target = repository.targets(plan.id()).stream()
                .filter(item -> item.targetId().equals(targetId))
                .findFirst().orElseThrow(() -> new NotFoundException("补学目标不存在"));
        JsonNode targetData = read(target.snapshotJson());
        JsonNode question = findQuestion(read(attempt.contentSnapshotJson()),
                targetData.path("questionId").asText());
        boolean correct = answerMatches(question, answer);
        if (correct) {
            repository.completeTarget(plan.id(), targetId);
        }
        ObjectNode response = objectMapper.createObjectNode();
        response.put("targetId", targetId);
        response.put("correct", correct);
        response.put("targetCompleted", correct || target.completed());
        response.put("planCompleted", repository.planComplete(plan.id()));
        response.put("explanation", feedbackExplanation(question, correct));
        if (!correct) {
            response.put("hint", feedbackHint(question));
        }
        return response;
    }

    public ObjectNode comprehensivePracticeRetry(long userId, long attemptId) {
        LearningRepository.Attempt attempt = repository.findAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("正式作答不存在"));
        LearningRepository.Plan plan = repository.planByAttempt(userId, attemptId)
                .orElseThrow(() -> new NotFoundException("该正式作答没有补学计划"));
        if (!repository.planComplete(plan.id())) {
            throw new BusinessConflictException("REMEDIATION_REQUIRED",
                    "全部补学目标完成后才能重新完成综合实务");
        }
        ObjectNode response = objectMapper.createObjectNode();
        response.put("routeId", attempt.routeId());
        response.put("stepType", StepType.COMPREHENSIVE_PRACTICE.name());
        response.put("practiceRetryUnlocked", true);
        response.set("content", catalog.publicStep(attempt.routeId(), StepType.COMPREHENSIVE_PRACTICE));
        return response;
    }

    public ObjectNode records(long userId, String line, String conclusion, int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new BadRequestException("分页参数无效");
        }
        if (line != null && !Set.of("CLEARING", "ACCOUNTING", "SUPERVISION").contains(line)) {
            throw new BadRequestException("条线筛选无效");
        }
        if (conclusion != null && !Set.of("PASSED", "LEARNED_NOT_MASTERED").contains(conclusion)) {
            throw new BadRequestException("结论筛选无效");
        }
        LearningRepository.RecordPage found = repository.attempts(
                userId, line, conclusion, size, Math.multiplyExact(page, size));
        ObjectNode response = objectMapper.createObjectNode();
        ArrayNode items = response.putArray("items");
        for (LearningRepository.Attempt attempt : found.items()) {
            ObjectNode item = items.addObject();
            item.put("attemptId", attempt.id());
            item.put("routeId", attempt.routeId());
            FormalContentCatalog.RouteMapEntry mapEntry = catalog.routeMapEntry(attempt.routeId());
            item.put("path", mapEntry.path());
            item.put("routeTitle", mapEntry.title());
            item.put("processingStatus", attempt.processingStatus());
            item.put("conclusion", attempt.conclusion());
            item.put("submittedAt", attempt.submittedAt().toString());
            repository.result(attempt.id()).ifPresent(result -> {
                item.put("totalScore", result.totalScore());
                JsonNode snapshot = read(result.json());
                ArrayNode summaries = item.putArray("dimensionSummary");
                for (JsonNode dimension : snapshot.path("dimensions")) {
                    summaries.addObject()
                            .put("dimension", dimension.path("dimension").asText())
                            .put("score", dimension.path("score").asInt())
                            .put("maxScore", dimension.path("maxScore").asInt());
                }
            });
        }
        response.put("page", page);
        response.put("size", size);
        response.put("totalElements", found.total());
        response.put("totalPages", found.total() == 0 ? 0 : (found.total() + size - 1) / size);
        return response;
    }

    public RouteState state(long userId, String routeId) {
        if (!catalog.isPublished(routeId)) {
            return RouteState.NOT_STARTED;
        }
        if (repository.hasPassed(userId, routeId)) {
            return RouteState.PASSED;
        }
        LearningRepository.Attempt latest = repository.latestAttempt(userId, routeId).orElse(null);
        if (latest != null && ProcessingStatus.COMPLETED.name().equals(latest.processingStatus())) {
            return RouteState.LEARNED_NOT_MASTERED;
        }
        return repository.hasLearningActivity(userId, routeId)
                ? RouteState.IN_PROGRESS : RouteState.NOT_STARTED;
    }

    private ObjectNode progressResponse(long userId, String routeId) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("routeId", routeId);
        result.put("state", state(userId, routeId).name());
        result.put("completedSteps", completedStepCount(userId, routeId));
        result.put("totalSteps", 4);
        StepType next = nextStep(userId, catalog.route(routeId));
        result.put("nextStep", next == null ? null : next.name());
        return result;
    }

    private int completedStepCount(long userId, String routeId) {
        RouteBundle route = catalog.route(routeId);
        int count = 0;
        for (StepType type : StepType.values()) {
            if (isStepComplete(userId, route, type)) {
                count++;
            }
        }
        return count;
    }

    private boolean isStepComplete(long userId, RouteBundle route, StepType type) {
        if (type == StepType.COMPREHENSIVE_PRACTICE) {
            return repository.latestAttempt(userId, route.routeId()).isPresent();
        }
        return repository.isStepComplete(userId, route.routeId(),
                route.contentVersion(), type.name());
    }

    private StepType nextStep(long userId, RouteBundle route) {
        for (StepType type : StepType.values()) {
            if (!isStepComplete(userId, route, type)) {
                return type;
            }
        }
        return null;
    }

    private boolean canAccessStep(long userId, RouteBundle route, StepType type) {
        if (!routeUnlocked(userId, route.routeId())) {
            return false;
        }
        if (repository.hasPassed(userId, route.routeId()) || isStepComplete(userId, route, type)) {
            return true;
        }
        return switch (type) {
            case KNOWLEDGE_CARD -> true;
            case DEMONSTRATION -> isStepComplete(userId, route, StepType.KNOWLEDGE_CARD);
            case BASIC_PRACTICE -> isStepComplete(userId, route, StepType.DEMONSTRATION);
            case COMPREHENSIVE_PRACTICE -> isStepComplete(userId, route, StepType.BASIC_PRACTICE);
        };
    }

    private void ensureSubmissionAllowed(long userId, RouteBundle route) {
        if (!isStepComplete(userId, route, StepType.BASIC_PRACTICE)) {
            throw new BusinessConflictException("LEARNING_SEQUENCE_VIOLATION",
                    "请先正确完成全部基础练习");
        }
        LearningRepository.Attempt latest = repository.latestAttempt(userId, route.routeId()).orElse(null);
        if (latest == null || repository.hasPassed(userId, route.routeId())) {
            return;
        }
        if (ProcessingStatus.SCORING.name().equals(latest.processingStatus())) {
            throw new BusinessConflictException("ATTEMPT_SCORING", "上一份正式作答仍在评分");
        }
        if (ProcessingStatus.FAILED.name().equals(latest.processingStatus())) {
            throw new BusinessConflictException("SCORING_RETRY_REQUIRED",
                    "上一份正式作答评分技术失败，请重试原作答评分");
        }
        LearningRepository.Plan plan = repository.planByAttempt(userId, latest.id())
                .orElseThrow(() -> new IllegalStateException("补学计划缺失"));
        if (!repository.planComplete(plan.id())) {
            throw new BusinessConflictException("REMEDIATION_REQUIRED",
                    "请先完成全部定向补学");
        }
    }

    private boolean remediationBlocksRetry(long userId, String routeId) {
        if (repository.hasPassed(userId, routeId)) {
            return false;
        }
        LearningRepository.Attempt latest = repository.latestAttempt(userId, routeId).orElse(null);
        if (latest == null || !ProcessingStatus.COMPLETED.name().equals(latest.processingStatus())) {
            return false;
        }
        LearningRepository.Plan plan = repository.planByAttempt(userId, latest.id()).orElse(null);
        return plan != null && !repository.planComplete(plan.id());
    }

    private RouteBundle requireVersion(String routeId, String contentVersion) {
        RouteBundle route = catalog.route(routeId);
        if (!route.contentVersion().equals(contentVersion)) {
            throw new BusinessConflictException("CONTENT_VERSION_MISMATCH",
                    "学习内容版本已变化，请刷新后重试");
        }
        return route;
    }

    private boolean answerMatches(JsonNode question, List<String> answer) {
        if (answer == null || answer.isEmpty()) {
            return false;
        }
        List<String> expected = new ArrayList<>();
        question.path("answer").forEach(item -> expected.add(item.asText()));
        String type = question.path("type").asText();
        if ("ORDERING".equals(type)) {
            return expected.equals(answer);
        }
        if ("CALCULATION".equals(type)) {
            return numericAnswersMatch(expected, answer,
                    question.path("calculation").path("fields"));
        }
        if ("RECONCILIATION".equals(type)) {
            return reconciliationAnswersMatch(question, expected, answer);
        }
        if ("SHORT_TEXT".equals(type)) {
            return shortTextAnswersMatch(expected, answer);
        }
        if ("FIELD_MAP".equals(type) || "LEDGER_ENTRY".equals(type)) {
            return expected.equals(answer);
        }
        return new HashSet<>(expected).equals(new HashSet<>(answer))
                && expected.size() == answer.size();
    }

    private String feedbackExplanation(JsonNode question, boolean correct) {
        if (correct || !isStructuredPracticeQuestion(question)) {
            return question.path("explanation").asText();
        }
        return "请回到题面资料，逐项核对输入、关系和业务结果后重试。";
    }

    private String feedbackHint(JsonNode question) {
        return switch (question.path("type").asText()) {
            case "FIELD_MAP" -> "先分开核对字段来源、方向、状态和确认时点。";
            case "CALCULATION" -> "先取出题面提供的各项输入，再按批准关系复算。";
            case "LEDGER_ENTRY" -> "先按借贷方向区分成本、费用、应付项和清算项。";
            case "RECONCILIATION" -> "先分别完成数量、成本、资金和市值关系，再核对是否闭合。";
            case "SHORT_TEXT" -> "逐项检查结论是否覆盖持仓、成本、资金、市值和勾稽。";
            default -> question.path("hints").path(0).asText("");
        };
    }

    private boolean isStructuredPracticeQuestion(JsonNode question) {
        return switch (question.path("type").asText()) {
            case "FIELD_MAP", "CALCULATION", "LEDGER_ENTRY", "RECONCILIATION", "SHORT_TEXT" -> true;
            default -> false;
        };
    }

    private boolean numericAnswersMatch(List<String> expected, List<String> answer, JsonNode fields) {
        if (!fields.isArray() || fields.size() != expected.size()
                || expected.size() != answer.size()) {
            return false;
        }
        for (int index = 0; index < expected.size(); index += 1) {
            if (!numericValueMatches(expected.get(index), answer.get(index), fields.path(index))) {
                return false;
            }
        }
        return true;
    }

    private boolean reconciliationAnswersMatch(JsonNode question, List<String> expected,
                                               List<String> answer) {
        JsonNode fields = question.path("reconciliation").path("fields");
        if (!fields.isArray() || fields.size() != expected.size()
                || expected.size() != answer.size()) {
            return false;
        }
        for (int index = 0; index < expected.size(); index += 1) {
            JsonNode field = fields.path(index);
            if ("NUMBER".equals(field.path("kind").asText())) {
                if (!numericValueMatches(expected.get(index), answer.get(index), field)) {
                    return false;
                }
            } else if (!expected.get(index).equals(answer.get(index))) {
                return false;
            }
        }
        return true;
    }

    private boolean numericValueMatches(String expectedValue, String actualValue, JsonNode field) {
        BigDecimal expectedNumber = parseNumber(expectedValue);
        BigDecimal actualNumber = parseNumber(actualValue);
        if (expectedNumber == null || actualNumber == null) {
            return false;
        }
        JsonNode tolerance = field.path("tolerance");
        if (tolerance.isNumber()) {
            BigDecimal allowedDifference = tolerance.decimalValue();
            return expectedNumber.subtract(actualNumber).abs().compareTo(allowedDifference) <= 0;
        }
        return expectedNumber.compareTo(actualNumber) == 0;
    }

    private boolean shortTextAnswersMatch(List<String> expected, List<String> answer) {
        if (answer.size() != 1) {
            return false;
        }
        String actual = normalizeText(answer.get(0));
        if (actual.isEmpty()) {
            return false;
        }
        return expected.stream().allMatch(term -> actual.contains(normalizeText(term)));
    }

    private BigDecimal parseNumber(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.replace(",", "")
                .replace("，", "")
                .replace(" ", "")
                .replace("　", "")
                .replace("\u00a0", "")
                .trim();
        if (normalized.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "")
                .replace("　", "");
    }

    private JsonNode findQuestion(JsonNode content, String questionId) {
        for (JsonNode question : content.path("steps").path("BASIC_PRACTICE").path("questions")) {
            if (questionId.equals(question.path("questionId").asText())) {
                return question;
            }
        }
        throw new IllegalStateException("历史补学题目快照缺失");
    }

    private ObjectNode publicQuestion(JsonNode question) {
        ObjectNode result = (ObjectNode) question.deepCopy();
        result.remove(List.of("answer", "explanation", "hints"));
        return result;
    }

    private ObjectNode planSummary(LearningRepository.Plan plan) {
        ObjectNode summary = objectMapper.createObjectNode();
        summary.put("planId", plan.id());
        summary.put("attemptId", plan.attemptId());
        summary.put("active", plan.active());
        int total = repository.targets(plan.id()).size();
        int completed = (int) repository.targets(plan.id()).stream()
                .filter(LearningRepository.Target::completed).count();
        summary.put("completedTargets", completed);
        summary.put("totalTargets", total);
        summary.put("completed", completed == total);
        summary.put("practiceRetryUnlocked", completed == total);
        return summary;
    }

    private boolean prerequisitesPassed(long userId, JsonNode line, JsonNode node) {
        if (node.path("prerequisiteNodeIds").isEmpty()) {
            return true;
        }
        Map<String, String> nodeRoutes = new LinkedHashMap<>();
        for (JsonNode region : line.path("regions")) {
            for (JsonNode module : region.path("modules")) {
                for (JsonNode candidate : module.path("nodes")) {
                    nodeRoutes.put(candidate.path("nodeId").asText(),
                            candidate.path("routeId").asText());
                }
            }
        }
        for (JsonNode prerequisite : node.path("prerequisiteNodeIds")) {
            String routeId = nodeRoutes.get(prerequisite.asText());
            if (routeId == null || !repository.hasPassed(userId, routeId)) {
                return false;
            }
        }
        return true;
    }

    private boolean routeUnlocked(long userId, String routeId) {
        for (JsonNode line : catalog.map().path("lines")) {
            for (JsonNode region : line.path("regions")) {
                for (JsonNode module : region.path("modules")) {
                    for (JsonNode node : module.path("nodes")) {
                        if (routeId.equals(node.path("routeId").asText())) {
                            return prerequisitesPassed(userId, line, node);
                        }
                    }
                }
            }
        }
        return false;
    }

    private JsonNode findLine(String lineName) {
        for (JsonNode line : catalog.map().path("lines")) {
            if (lineName.equals(line.path("line").asText())) {
                return line;
            }
        }
        throw new NotFoundException("学习世界不存在");
    }

    private List<String> publishedRequiredRouteIds() {
        List<String> routeIds = new ArrayList<>();
        for (JsonNode line : catalog.map().path("lines")) {
            for (JsonNode region : line.path("regions")) {
                for (JsonNode module : region.path("modules")) {
                    for (JsonNode node : module.path("nodes")) {
                        String routeId = node.path("routeId").asText();
                        if ("REQUIRED".equals(node.path("pathType").asText())
                                && catalog.isPublished(routeId)) {
                            routeIds.add(routeId);
                        }
                    }
                }
            }
        }
        return routeIds;
    }

    private String worldStatus(String availability, int passed, int total, boolean hasActivity) {
        if ("BUILDING".equals(availability)) {
            return "BUILDING";
        }
        if (passed > 0 && passed == total) {
            return "PASSED";
        }
        if (hasActivity) {
            return "IN_PROGRESS";
        }
        return "NOT_STARTED";
    }

    private String write(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("内容快照序列化失败", exception);
        }
    }

    private JsonNode read(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("历史快照无法读取", exception);
        }
    }

    private ObjectNode publicScoringResult(JsonNode stored) {
        ObjectNode result = (ObjectNode) stored.deepCopy();
        result.remove("mandatoryRequirements");
        for (JsonNode dimension : result.path("dimensions")) {
            for (JsonNode item : dimension.path("items")) {
                if (item instanceof ObjectNode object) {
                    object.remove(List.of("itemId", "description"));
                }
            }
        }
        return result;
    }

    private void dispatchScoring(long attemptId, String callerExternalId) {
        try {
            scoringDispatcher.score(attemptId, callerExternalId);
        } catch (RuntimeException exception) {
            repository.failScoring(attemptId, "SCORING_DISPATCH_FAILED");
        }
    }
}
