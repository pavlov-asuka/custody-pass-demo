package com.ccb.custodytraining.auth;

public final class AuthConstants {

    public static final String LOGIN_TIME_SESSION_ATTRIBUTE =
            "custody.training.authenticatedAt";
    public static final long ABSOLUTE_SESSION_TIMEOUT_MILLIS = 8L * 60L * 60L * 1000L;

    private AuthConstants() {
    }
}
