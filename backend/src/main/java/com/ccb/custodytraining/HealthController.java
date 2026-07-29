package com.ccb.custodytraining;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final String mode;

    public HealthController(@Value("${app.mode:mock}") String mode) {
        this.mode = mode;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "application", "custody-training",
                "mode", mode
        );
    }
}
