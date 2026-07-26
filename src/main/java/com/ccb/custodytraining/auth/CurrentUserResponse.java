package com.ccb.custodytraining.auth;

import com.ccb.custodytraining.user.AppUser;
import com.ccb.custodytraining.user.AppUserPrincipal;

public record CurrentUserResponse(String employeeNo, String displayName) {

    public static CurrentUserResponse from(AppUser user) {
        return new CurrentUserResponse(user.employeeNo(), user.displayName());
    }

    public static CurrentUserResponse from(AppUserPrincipal principal) {
        return from(principal.user());
    }
}
