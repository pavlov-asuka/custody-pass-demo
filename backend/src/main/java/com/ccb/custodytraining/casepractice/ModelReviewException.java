package com.ccb.custodytraining.casepractice;

public class ModelReviewException extends RuntimeException {

    private final String errorType;

    public ModelReviewException(String errorType) {
        super("模型评分结果不可用");
        this.errorType = errorType;
    }

    public ModelReviewException(String errorType, Throwable cause) {
        super("模型评分结果不可用", cause);
        this.errorType = errorType;
    }

    public String errorType() {
        return errorType;
    }
}
