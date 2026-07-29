package com.ccb.custodytraining.model;

import java.time.Duration;

public interface ModelChatClient {

    default String mode() {
        return "OPENAI_COMPATIBLE";
    }

    String complete(String systemPrompt, String userPrompt, String callerExternalId,
                    Duration remainingBudget);
}
