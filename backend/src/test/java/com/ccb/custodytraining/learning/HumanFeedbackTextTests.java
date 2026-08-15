package com.ccb.custodytraining.learning;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

class HumanFeedbackTextTests {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void learnerFeedbackTranslatesMixedAndStandaloneInternalLabels() {
        ObjectNode target = objectMapper.createObjectNode();
        target.put("reason", "内部 closing shares 读取或登记错误");
        assertEquals("内部期末份额 读取或登记错误", HumanFeedbackText.remediationReason(target));

        String evidence = HumanFeedbackText.publicEvidence(
                "归档证据",
                "archiveId/status 已与资料核对",
                true);
        assertTrue(evidence.contains("归档记录/状态"));
        assertFalse(evidence.contains("archiveId"));
        assertFalse(evidence.contains("/status"));
    }
}
