package com.ccb.custodytraining.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthService(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = new HttpSessionSecurityContextRepository();
    }

    public Authentication login(
            String employeeNo,
            String password,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws AuthenticationException {
        validateLoginInput(employeeNo, password);
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(employeeNo, password)
        );

        HttpSession session = request.getSession(true);
        request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        session.setAttribute(
                AuthConstants.LOGIN_TIME_SESSION_ATTRIBUTE,
                System.currentTimeMillis()
        );
        securityContextRepository.saveContext(context, request, response);
        return authentication;
    }

    private void validateLoginInput(String employeeNo, String password) {
        if (employeeNo == null || employeeNo.trim().isEmpty()
                || employeeNo.trim().length() > 32
                || password == null || password.isEmpty() || password.length() > 128) {
            throw new AuthenticationServiceException("登录凭据无效");
        }
    }
}
