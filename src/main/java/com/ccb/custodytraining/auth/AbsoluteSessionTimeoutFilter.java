package com.ccb.custodytraining.auth;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class AbsoluteSessionTimeoutFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    public AbsoluteSessionTimeoutFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        HttpSession session = request.getSession(false);
        if (authentication != null && authentication.isAuthenticated() && session != null) {
            Object loginTimeValue = session.getAttribute(AuthConstants.LOGIN_TIME_SESSION_ATTRIBUTE);
            if (loginTimeValue instanceof Number loginTime
                    && System.currentTimeMillis() - loginTime.longValue()
                    >= AuthConstants.ABSOLUTE_SESSION_TIMEOUT_MILLIS) {
                session.invalidate();
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                objectMapper.writeValue(response.getWriter(),
                        new ApiError("UNAUTHORIZED", "登录已过期，请重新登录"));
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
