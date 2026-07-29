package com.ccb.custodytraining.learning;

public final class LearningTypes {

    private LearningTypes() {
    }

    public enum Line {
        CLEARING, ACCOUNTING, SUPERVISION
    }

    public enum StepType {
        KNOWLEDGE_CARD, DEMONSTRATION, BASIC_PRACTICE, EXCEPTION_CASE
    }

    public enum RouteState {
        LOCKED, NOT_STARTED, IN_PROGRESS, LEARNED_NOT_MASTERED, PASSED
    }

    public enum ProcessingStatus {
        SCORING, COMPLETED, FAILED
    }

    public enum Conclusion {
        PASSED, LEARNED_NOT_MASTERED
    }
}
