package com.ccb.custodytraining.knowledge;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.knowledge")
public class KnowledgeProperties {

    private String answerMode = "mock";

    public String getAnswerMode() {
        return answerMode;
    }

    public void setAnswerMode(String answerMode) {
        this.answerMode = answerMode;
    }
}
