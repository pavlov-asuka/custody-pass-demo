package com.ccb.custodytraining.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the same SPA entry point for every browser route owned by the
 * frontend. API requests and static assets intentionally have no mapping here.
 */
@Controller
public class SpaForwardController {

    @GetMapping({
            "/",
            "/login",
            "/worlds",
            "/map/{line}",
            "/learn/{routeId}",
            "/attempts/{attemptId}",
            "/attempts/{attemptId}/remediation",
            "/records",
            "/records/{attemptId}"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
