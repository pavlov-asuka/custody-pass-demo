package com.ccb.custodytraining.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ccb.custodytraining.user.AppUserPrincipal;

@RestController
@RequestMapping("/api/auth")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken csrfToken) {
        return new CsrfResponse(csrfToken.getToken(), csrfToken.getHeaderName());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody JsonNode requestBody,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (!isValidLoginRequest(requestBody)) {
            return ResponseEntity.badRequest()
                    .body(new ApiError("BAD_REQUEST", "登录请求格式无效"));
        }
        LoginRequest loginRequest = new LoginRequest(
                requestBody.get("employeeNo").textValue(),
                requestBody.get("password").textValue()
        );
        try {
            Authentication authentication = authService.login(
                    loginRequest.employeeNo(),
                    loginRequest.password(),
                    request,
                    response
            );
            return ResponseEntity.ok(CurrentUserResponse.from(
                    (AppUserPrincipal) authentication.getPrincipal()
            ));
        } catch (AuthenticationException exception) {
            return ResponseEntity.status(401)
                    .body(new ApiError("UNAUTHORIZED", "员工号或密码错误"));
        }
    }

    @GetMapping("/me")
    public CurrentUserResponse me(Authentication authentication) {
        return CurrentUserResponse.from(
                (AppUserPrincipal) authentication.getPrincipal()
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(String employeeNo, String password) {
    }

    public record CsrfResponse(String token, String headerName) {
    }

    private boolean isValidLoginRequest(JsonNode requestBody) {
        return requestBody != null
                && requestBody.isObject()
                && requestBody.size() == 2
                && requestBody.has("employeeNo")
                && requestBody.has("password")
                && requestBody.get("employeeNo").isTextual()
                && requestBody.get("password").isTextual();
    }
}
