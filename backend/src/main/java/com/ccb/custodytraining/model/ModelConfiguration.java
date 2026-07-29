package com.ccb.custodytraining.model;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class ModelConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "app.model", name = "transport", havingValue = "openai",
            matchIfMissing = true)
    @ConditionalOnExpression("'openai'.equals('${app.review.mode:mock}') or 'openai'.equals('${app.knowledge.answer-mode:mock}')")
    public ModelChatClient openAiCompatibleModelClient(ObjectMapper objectMapper,
                                                        ModelProperties properties) {
        return new OpenAiCompatibleModelClient(objectMapper, properties);
    }
}
