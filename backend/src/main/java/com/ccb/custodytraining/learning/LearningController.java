package com.ccb.custodytraining.learning;

import java.util.ArrayList;
import java.util.List;

import com.ccb.custodytraining.learning.LearningTypes.StepType;
import com.ccb.custodytraining.user.AppUserPrincipal;
import com.ccb.custodytraining.web.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class LearningController {

    private static final String REQUEST_ID_PATTERN = "[A-Za-z0-9_-]{8,64}";

    private final LearningService service;

    public LearningController(LearningService service) {
        this.service = service;
    }

    @GetMapping("/worlds")
    public ObjectNode worlds(Authentication authentication) {
        return service.worlds(user(authentication).id());
    }

    @GetMapping("/lines/{line}/map")
    public ObjectNode map(@PathVariable String line, Authentication authentication) {
        return service.map(user(authentication).id(), line);
    }

    @GetMapping("/routes/{routeId}")
    public ObjectNode overview(@PathVariable String routeId, Authentication authentication) {
        return service.routeOverview(user(authentication).id(), routeId);
    }

    @GetMapping("/routes/{routeId}/steps/{stepType}")
    public ObjectNode step(@PathVariable String routeId, @PathVariable String stepType,
                           Authentication authentication) {
        return service.step(user(authentication).id(), routeId, stepType(stepType));
    }

    @PostMapping("/routes/{routeId}/steps/{stepType}/complete")
    public ObjectNode completeStep(@PathVariable String routeId, @PathVariable String stepType,
                                   @RequestBody JsonNode body, Authentication authentication) {
        requireObject(body, 2, "eventId", "contentVersion");
        requireRequestId(body.path("eventId").asText());
        return service.completeStep(user(authentication).id(), routeId, stepType(stepType),
                requiredText(body, "contentVersion"));
    }

    @PostMapping("/routes/{routeId}/basic-practice/{questionId}/answers")
    public ObjectNode answerQuestion(@PathVariable String routeId, @PathVariable String questionId,
                                     @RequestBody JsonNode body, Authentication authentication) {
        requireObject(body, 3, "requestId", "contentVersion", "answer");
        requireRequestId(body.path("requestId").asText());
        return service.answerBasicQuestion(user(authentication).id(), routeId, questionId,
                requiredText(body, "contentVersion"), answerArray(body.path("answer")));
    }

    @GetMapping("/routes/{routeId}/draft")
    public ObjectNode draft(@PathVariable String routeId, Authentication authentication) {
        return service.draft(user(authentication).id(), routeId);
    }

    @PutMapping("/routes/{routeId}/draft")
    public ObjectNode saveDraft(@PathVariable String routeId, @RequestBody JsonNode body,
                                Authentication authentication) {
        if (body == null || !body.isObject()
                || body.size() < 2 || body.size() > 3
                || !body.has("contentVersion") || !body.has("answer")
                || !body.path("contentVersion").isTextual() || !body.path("answer").isTextual()
                || (body.has("expectedRevision") && !body.path("expectedRevision").canConvertToLong())) {
            throw new BadRequestException("草稿请求格式无效");
        }
        Long expectedRevision = body.has("expectedRevision")
                ? body.path("expectedRevision").asLong() : null;
        return service.saveDraft(user(authentication).id(), routeId,
                body.path("contentVersion").asText(), body.path("answer").asText(),
                expectedRevision);
    }

    @PostMapping("/routes/{routeId}/attempts")
    public ObjectNode submit(@PathVariable String routeId, @RequestBody JsonNode body,
                             Authentication authentication) {
        requireObject(body, 4, "clientRequestId", "contentVersion", "rubricVersion", "answer");
        String requestId = requiredText(body, "clientRequestId");
        requireRequestId(requestId);
        return service.submit(user(authentication).id(), user(authentication).employeeNo(),
                routeId, requiredText(body, "contentVersion"),
                requiredText(body, "rubricVersion"), requestId, requiredText(body, "answer"));
    }

    @GetMapping("/attempts/{attemptId}")
    public ObjectNode attempt(@PathVariable long attemptId, Authentication authentication) {
        return service.attempt(user(authentication).id(), attemptId);
    }

    @PostMapping("/attempts/{attemptId}/retry-scoring")
    public ObjectNode retryScoring(@PathVariable long attemptId, Authentication authentication) {
        return service.retryScoring(user(authentication).id(), user(authentication).employeeNo(),
                attemptId);
    }

    @GetMapping("/attempts/{attemptId}/remediation")
    public ObjectNode remediation(@PathVariable long attemptId, Authentication authentication) {
        return service.remediation(user(authentication).id(), attemptId);
    }

    @PostMapping("/attempts/{attemptId}/remediation/{targetId}/answers")
    public ObjectNode answerRemediation(@PathVariable long attemptId, @PathVariable String targetId,
                                        @RequestBody JsonNode body, Authentication authentication) {
        requireObject(body, 2, "requestId", "answer");
        requireRequestId(requiredText(body, "requestId"));
        return service.answerRemediation(user(authentication).id(), attemptId, targetId,
                answerArray(body.path("answer")));
    }

    @PostMapping("/attempts/{attemptId}/challenge")
    public ObjectNode challenge(@PathVariable long attemptId, Authentication authentication) {
        return service.challenge(user(authentication).id(), attemptId);
    }

    @GetMapping("/training-records")
    public ObjectNode records(@RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "20") int size,
                              @RequestParam(required = false) String line,
                              @RequestParam(required = false) String conclusion,
                              Authentication authentication) {
        return service.records(user(authentication).id(), line, conclusion, page, size);
    }

    @GetMapping("/training-records/{attemptId}")
    public ObjectNode recordDetail(@PathVariable long attemptId, Authentication authentication) {
        return service.attempt(user(authentication).id(), attemptId);
    }

    private AppUserPrincipal.AppUserView user(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return new AppUserPrincipal.AppUserView(
                principal.user().id(), principal.user().employeeNo());
    }

    private StepType stepType(String value) {
        try {
            return StepType.valueOf(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("学习环节类型无效");
        }
    }

    private void requireObject(JsonNode body, int size, String... fields) {
        if (body == null || !body.isObject() || body.size() != size) {
            throw new BadRequestException("请求格式无效");
        }
        for (String field : fields) {
            if (!body.has(field)) {
                throw new BadRequestException("请求缺少字段 " + field);
            }
        }
    }

    private String requiredText(JsonNode body, String field) {
        if (!body.path(field).isTextual() || body.path(field).asText().isBlank()) {
            throw new BadRequestException("字段 " + field + " 无效");
        }
        return body.path(field).asText();
    }

    private List<String> answerArray(JsonNode answer) {
        if (!answer.isArray() || answer.isEmpty() || answer.size() > 20) {
            throw new BadRequestException("答案格式无效");
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : answer) {
            if (!item.isTextual() || item.asText().isBlank()) {
                throw new BadRequestException("答案格式无效");
            }
            values.add(item.asText());
        }
        return List.copyOf(values);
    }

    private void requireRequestId(String requestId) {
        if (requestId == null || !requestId.matches(REQUEST_ID_PATTERN)) {
            throw new BadRequestException("请求幂等标识格式无效");
        }
    }
}
