package com.ccb.custodytraining.user;

public record AppUser(
        Long id,
        String employeeNo,
        String displayName,
        String passwordHash,
        boolean enabled
) {
}
