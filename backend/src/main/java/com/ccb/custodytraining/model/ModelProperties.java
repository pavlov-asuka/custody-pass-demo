package com.ccb.custodytraining.model;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.model")
public class ModelProperties {

    private String baseUrl;
    private String chatPath = "/chat/completions";
    private String apiKey;
    private String modelName;
    private boolean sendUserIdHeader;
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration reviewTimeBudget = Duration.ofSeconds(15);
    private int maxTokens = 3000;
    private double temperature = 0.1d;
    private int maxRepairAttempts = 1;
    private ThinkingMode thinkingMode = ThinkingMode.OMIT;
    private String transport = "openai";

    public void validateForOpenAi() {
        requireText(baseUrl, "app.model.base-url");
        requireText(apiKey, "app.model.api-key");
        requireText(modelName, "app.model.model-name");
        requireText(chatPath, "app.model.chat-path");
        if (connectTimeout == null || connectTimeout.isNegative() || connectTimeout.isZero()
                || connectTimeout.compareTo(Duration.ofSeconds(30)) > 0) {
            throw new IllegalStateException("模型连接超时时间必须在 1-30 秒内");
        }
        if (reviewTimeBudget == null || reviewTimeBudget.compareTo(Duration.ofSeconds(2)) < 0
                || reviewTimeBudget.compareTo(Duration.ofSeconds(120)) > 0) {
            throw new IllegalStateException("模型评审时间预算必须在 2-120 秒内");
        }
        if (maxTokens < 1 || maxTokens > 12000) {
            throw new IllegalStateException("模型 maxTokens 必须在 1-12000 内");
        }
        if (Double.isNaN(temperature) || Double.isInfinite(temperature)
                || temperature < 0d || temperature > 1d) {
            throw new IllegalStateException("模型 temperature 必须在 0-1 内");
        }
        if (maxRepairAttempts != 0 && maxRepairAttempts != 1) {
            throw new IllegalStateException("模型 maxRepairAttempts 只能为 0 或 1");
        }
        if (thinkingMode == null) {
            throw new IllegalStateException("模型 thinkingMode 必须为 omit、enabled 或 disabled");
        }
    }

    public String getTransport() {
        return transport;
    }

    public void setTransport(String transport) {
        this.transport = transport;
    }

    private static void requireText(String value, String property) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalStateException(property + " 在 openai 模式下不能为空");
        }
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getChatPath() {
        return chatPath;
    }

    public void setChatPath(String chatPath) {
        this.chatPath = chatPath;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public boolean isSendUserIdHeader() {
        return sendUserIdHeader;
    }

    public void setSendUserIdHeader(boolean sendUserIdHeader) {
        this.sendUserIdHeader = sendUserIdHeader;
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public Duration getReviewTimeBudget() {
        return reviewTimeBudget;
    }

    public void setReviewTimeBudget(Duration reviewTimeBudget) {
        this.reviewTimeBudget = reviewTimeBudget;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public int getMaxRepairAttempts() {
        return maxRepairAttempts;
    }

    public void setMaxRepairAttempts(int maxRepairAttempts) {
        this.maxRepairAttempts = maxRepairAttempts;
    }

    public ThinkingMode getThinkingMode() {
        return thinkingMode;
    }

    public void setThinkingMode(ThinkingMode thinkingMode) {
        this.thinkingMode = thinkingMode;
    }

    public enum ThinkingMode {
        OMIT("omit"),
        ENABLED("enabled"),
        DISABLED("disabled");

        private final String wireValue;

        ThinkingMode(String wireValue) {
            this.wireValue = wireValue;
        }

        public String wireValue() {
            return wireValue;
        }
    }
}
