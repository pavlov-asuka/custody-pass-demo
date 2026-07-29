package com.ccb.custodytraining.training;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.ccb.custodytraining.casepractice.CaseAsset;
import com.ccb.custodytraining.casepractice.CaseCatalog;
import com.ccb.custodytraining.casepractice.CaseDimension;
import com.ccb.custodytraining.casepractice.CaseDimensionAsset;
import com.ccb.custodytraining.casepractice.CasePoint;
import com.ccb.custodytraining.casepractice.CaseReviewer;
import com.ccb.custodytraining.web.BadRequestException;
import com.ccb.custodytraining.web.IdempotencyConflictException;
import com.ccb.custodytraining.web.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class TrainingRecordService {

    private final CaseCatalog caseCatalog;
    private final CaseReviewer caseReviewer;
    private final TrainingRecordRepository recordRepository;
    private final ObjectMapper objectMapper;

    public TrainingRecordService(
            CaseCatalog caseCatalog,
            CaseReviewer caseReviewer,
            TrainingRecordRepository recordRepository,
            ObjectMapper objectMapper
    ) {
        this.caseCatalog = caseCatalog;
        this.caseReviewer = caseReviewer;
        this.recordRepository = recordRepository;
        this.objectMapper = objectMapper;
    }

    public TrainingRecordDto.Detail submit(
            Long userId,
            String callerExternalId,
            String caseId,
            String clientRequestId,
            String answer
    ) {
        CaseAsset asset = caseCatalog.getRequired(caseId);
        String normalizedAnswer = answer.trim();
        TrainingRecord existing = recordRepository.findByUserAndClientRequestId(userId, clientRequestId)
                .orElse(null);
        if (existing != null) {
            return returnExistingOrConflict(existing, caseId, normalizedAnswer);
        }

        String reviewerMode = validateReviewerMode(caseReviewer.reviewerMode());
        CaseReviewer.ReviewDraft draft = caseReviewer.review(asset, normalizedAnswer, callerExternalId);
        TrainingSnapshot snapshot = buildSnapshot(asset, draft);
        String snapshotJson = serialize(snapshot);
        try {
            TrainingRecord inserted = recordRepository.insert(
                    userId, asset.id(), asset.version(), asset.rubricVersion(), clientRequestId,
                    normalizedAnswer, totalScore(snapshot), reviewerMode, snapshotJson, Instant.now());
            return toDetail(inserted);
        } catch (DuplicateKeyException exception) {
            TrainingRecord concurrent = recordRepository.findByUserAndClientRequestId(userId, clientRequestId)
                    .orElseThrow(() -> new IdempotencyConflictException("请求正在处理中，请稍后重试"));
            return returnExistingOrConflict(concurrent, caseId, normalizedAnswer);
        }
    }

    public TrainingRecordDto.Detail getDetail(Long userId, Long recordId) {
        TrainingRecord record = recordRepository.findByUserAndId(userId, recordId)
                .orElseThrow(() -> new NotFoundException("训练记录不存在"));
        return toDetail(record);
    }

    public TrainingRecordDto.Page getPage(Long userId, int page, int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new BadRequestException("分页参数无效");
        }
        long totalElements = recordRepository.countByUser(userId);
        int offset = Math.multiplyExact(page, size);
        List<TrainingRecordDto.Summary> items = recordRepository.findPageByUser(userId, size, offset)
                .stream().map(this::toSummary).toList();
        int totalPages = totalElements == 0 ? 0 : (int) ((totalElements + size - 1) / size);
        return new TrainingRecordDto.Page(items, page, size, totalElements, totalPages);
    }

    private TrainingRecordDto.Detail returnExistingOrConflict(
            TrainingRecord existing,
            String caseId,
            String answer
    ) {
        if (!existing.caseId().equals(caseId) || !existing.answer().equals(answer)) {
            throw new IdempotencyConflictException("clientRequestId 已对应其他提交");
        }
        return toDetail(existing);
    }

    private TrainingSnapshot buildSnapshot(CaseAsset asset, CaseReviewer.ReviewDraft draft) {
        Map<String, CaseReviewer.PointDecision> decisions = new HashMap<>();
        for (CaseReviewer.PointDecision decision : draft.pointDecisions()) {
            if (decisions.put(decision.pointId(), decision) != null) {
                throw new IllegalStateException("评分结果包含重复得分点");
            }
        }

        List<TrainingRecordDto.DimensionResult> dimensions = new ArrayList<>();
        List<String> matchedIds = new ArrayList<>();
        List<String> missedIds = new ArrayList<>();
        Set<String> suggestionTopicIds = new HashSet<>();
        List<TrainingRecordDto.LearningSuggestion> suggestions = new ArrayList<>();
        Set<String> knownPointIds = new HashSet<>();

        for (CaseDimension dimension : CaseDimension.values()) {
            CaseDimensionAsset dimensionAsset = asset.dimensions().get(dimension);
            List<TrainingRecordDto.PointResult> pointResults = new ArrayList<>();
            int score = 0;
            for (CasePoint point : dimensionAsset.points()) {
                knownPointIds.add(point.pointId());
                CaseReviewer.PointDecision decision = decisions.get(point.pointId());
                if (decision == null) {
                    throw new IllegalStateException("评分结果缺少得分点");
                }
                boolean matched = decision.matched();
                if (matched) {
                    score += point.weight();
                    matchedIds.add(point.pointId());
                } else {
                    missedIds.add(point.pointId());
                    for (String topicId : point.knowledgeTopicIds()) {
                        if (suggestionTopicIds.add(topicId)) {
                            suggestions.add(new TrainingRecordDto.LearningSuggestion(
                                    topicId, "建议复习知识主题 " + topicId + "，补充掌握相关处理要求。"));
                        }
                    }
                }
                pointResults.add(new TrainingRecordDto.PointResult(
                        point.pointId(), point.description(), point.weight(), matched, decision.evidence()));
            }
            dimensions.add(new TrainingRecordDto.DimensionResult(
                    dimension, score, dimensionAsset.maxScore(), List.copyOf(pointResults)));
        }
        if (!knownPointIds.equals(decisions.keySet())) {
            throw new IllegalStateException("评分结果包含未知得分点");
        }
        return new TrainingSnapshot(asset.title(), asset.line().name(), List.copyOf(dimensions),
                List.copyOf(matchedIds), List.copyOf(missedIds), List.copyOf(suggestions));
    }

    private int totalScore(TrainingSnapshot snapshot) {
        return snapshot.dimensions().stream().mapToInt(TrainingRecordDto.DimensionResult::score).sum();
    }

    private String validateReviewerMode(String reviewerMode) {
        if (reviewerMode == null || reviewerMode.isBlank() || reviewerMode.length() > 32) {
            throw new IllegalStateException("评分模式无效");
        }
        return reviewerMode;
    }

    private String serialize(TrainingSnapshot snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("评分快照序列化失败", exception);
        }
    }

    private TrainingRecordDto.Detail toDetail(TrainingRecord record) {
        try {
            TrainingSnapshot snapshot = objectMapper.readValue(record.snapshotJson(), TrainingSnapshot.class);
            return new TrainingRecordDto.Detail(record.id(), record.caseId(), record.caseVersion(),
                    record.rubricVersion(), snapshot.caseTitle(), snapshot.caseLine(), record.answer(),
                    record.createdAt(), record.reviewerMode(), record.totalScore(), 100,
                    snapshot.dimensions(), snapshot.matchedPointIds(), snapshot.missedPointIds(),
                    snapshot.learningSuggestions());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("训练记录快照无法读取", exception);
        }
    }

    private TrainingRecordDto.Summary toSummary(TrainingRecord record) {
        try {
            TrainingSnapshot snapshot = objectMapper.readValue(record.snapshotJson(), TrainingSnapshot.class);
            return new TrainingRecordDto.Summary(record.id(), record.caseId(), snapshot.caseTitle(),
                    snapshot.caseLine(), record.totalScore(), 100, record.reviewerMode(), record.createdAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("训练记录快照无法读取", exception);
        }
    }
}
