package com.ccb.custodytraining.model;

public class ModelClientException extends RuntimeException {

    private final String errorType;

    public ModelClientException(String errorType) {
        super("模型服务调用失败");
        this.errorType = errorType;
    }

    public ModelClientException(String errorType, Throwable cause) {
        super("模型服务调用失败", cause);
        this.errorType = errorType;
    }

    public String errorType() {
        return errorType;
    }
}
