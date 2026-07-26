package com.ccb.custodytraining.knowledge;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    private final KnowledgeService knowledgeService;

    public KnowledgeController(KnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @GetMapping("/topics")
    public List<KnowledgeCatalog.KnowledgeTopicDto> topics() {
        return knowledgeService.topics();
    }

    @PostMapping("/questions")
    public KnowledgeAnswerer.KnowledgeAnswer ask(@RequestBody JsonNode body,
                                                  Authentication authentication) {
        return knowledgeService.ask(body, authentication.getName());
    }
}
