package com.ccb.custodytraining.casepractice;

import java.util.List;

import com.ccb.custodytraining.training.TrainingRecordDto;
import com.ccb.custodytraining.training.TrainingRecordService;
import com.ccb.custodytraining.user.AppUserPrincipal;
import com.ccb.custodytraining.web.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cases")
public class CaseController {

    private static final String REQUEST_ID_PATTERN = "[A-Za-z0-9_-]{8,64}";

    private final CaseCatalog caseCatalog;
    private final TrainingRecordService trainingRecordService;

    public CaseController(CaseCatalog caseCatalog, TrainingRecordService trainingRecordService) {
        this.caseCatalog = caseCatalog;
        this.trainingRecordService = trainingRecordService;
    }

    @GetMapping
    public List<CaseDto.Summary> list(@RequestParam(required = false) String line) {
        if (line == null) {
            return caseCatalog.findAll().stream().map(CaseDto.Summary::from).toList();
        }
        if (line.isBlank()) {
            throw new BadRequestException("条线参数无效");
        }
        try {
            return caseCatalog.findByLine(CaseLine.valueOf(line)).stream()
                    .map(CaseDto.Summary::from).toList();
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("条线参数无效");
        }
    }

    @GetMapping("/{caseId}")
    public CaseDto.Detail detail(@PathVariable String caseId) {
        return CaseDto.Detail.from(caseCatalog.getRequired(caseId));
    }

    @PostMapping("/{caseId}/submissions")
    public ResponseEntity<TrainingRecordDto.Detail> submit(
            @PathVariable String caseId,
            @RequestBody JsonNode requestBody,
            Authentication authentication
    ) {
        SubmissionRequest submission = parseSubmission(requestBody);
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(trainingRecordService.submit(
                principal.user().id(), principal.user().employeeNo(), caseId,
                submission.clientRequestId(), submission.answer()));
    }

    private SubmissionRequest parseSubmission(JsonNode body) {
        if (body == null || !body.isObject() || body.size() != 2
                || !body.has("clientRequestId") || !body.has("answer")
                || !body.get("clientRequestId").isTextual() || !body.get("answer").isTextual()) {
            throw new BadRequestException("提交请求必须且只能包含 clientRequestId 和 answer");
        }
        String clientRequestId = body.get("clientRequestId").textValue();
        String answer = body.get("answer").textValue().trim();
        if (!clientRequestId.matches(REQUEST_ID_PATTERN)) {
            throw new BadRequestException("clientRequestId 格式无效");
        }
        if (answer.length() < 1 || answer.length() > 12000) {
            throw new BadRequestException("answer 长度必须为 1-12000 个字符");
        }
        return new SubmissionRequest(clientRequestId, answer);
    }

    private record SubmissionRequest(String clientRequestId, String answer) {
    }
}
