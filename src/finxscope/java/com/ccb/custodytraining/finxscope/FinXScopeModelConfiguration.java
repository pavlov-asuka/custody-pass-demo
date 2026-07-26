package com.ccb.custodytraining.finxscope;

import com.ccb.custodytraining.model.ModelChatClient;
import com.ccb.custodytraining.model.ModelProperties;
import com.ccb.framework.finxscope.executor.framework.AgentProcessEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "app.model", name = "transport", havingValue = "finxscope")
public class FinXScopeModelConfiguration {

    @Bean
    public ModelChatClient finXScopeModelChatClient(
            AgentProcessEngine agentProcessEngine,
            ObjectMapper objectMapper,
            ModelProperties modelProperties,
            @Value("${app.finxscope.agent-name:custody_training_agent}") String agentName,
            @Value("${app.finxscope.executor-threads:4}") int executorThreads) {
        if (executorThreads < 1 || executorThreads > 16) {
            throw new IllegalStateException("Fin-X-Scope 执行线程数必须在 1-16 内");
        }
        return new FinXScopeModelChatClient(agentProcessEngine, objectMapper,
                modelProperties, agentName, executorThreads);
    }
}
