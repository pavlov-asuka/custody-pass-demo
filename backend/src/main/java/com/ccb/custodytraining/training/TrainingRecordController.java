package com.ccb.custodytraining.training;

import com.ccb.custodytraining.user.AppUserPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/training-records")
public class TrainingRecordController {

    private final TrainingRecordService trainingRecordService;

    public TrainingRecordController(TrainingRecordService trainingRecordService) {
        this.trainingRecordService = trainingRecordService;
    }

    @GetMapping
    public TrainingRecordDto.Page list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return trainingRecordService.getPage(principal.user().id(), page, size);
    }

    @GetMapping("/{recordId}")
    public TrainingRecordDto.Detail detail(
            @PathVariable Long recordId,
            Authentication authentication
    ) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return trainingRecordService.getDetail(principal.user().id(), recordId);
    }
}
