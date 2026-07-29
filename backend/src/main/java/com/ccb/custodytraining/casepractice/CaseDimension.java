package com.ccb.custodytraining.casepractice;

public enum CaseDimension {
    CONCEPT(25),
    PROCESS(30),
    RISK(25),
    EXPRESSION(20);

    private final int maxScore;

    CaseDimension(int maxScore) {
        this.maxScore = maxScore;
    }

    public int maxScore() {
        return maxScore;
    }
}
