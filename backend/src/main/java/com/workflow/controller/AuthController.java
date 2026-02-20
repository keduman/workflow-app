package com.workflow.controller;

import com.workflow.config.AppSecurityProperties;
import com.workflow.config.JwtProperties;
import com.workflow.dto.*;
import com.workflow.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private final AuthService authService;
    private final JwtProperties jwtProperties;
    private final AppSecurityProperties securityProperties;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.register(request);
        setRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(withoutRefreshTokenInBody(authResponse));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request);
        setRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(withoutRefreshTokenInBody(authResponse));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        clearRefreshTokenCookie(response);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        String token = getRefreshTokenFromCookie(request);
        if (token == null && body != null && body.refreshToken() != null) {
            token = body.refreshToken();
        }
        if (token == null || token.isBlank()) {
            throw new com.workflow.exception.BadRequestException("Refresh token is required (cookie or body)");
        }
        AuthResponse authResponse = authService.refreshToken(token);
        setRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(withoutRefreshTokenInBody(authResponse));
    }

    private String getRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(securityProperties.secureCookies());
        cookie.setPath("/");
        cookie.setMaxAge((int) (jwtProperties.refreshExpirationMs() / 1000));
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(securityProperties.secureCookies());
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private AuthResponse withoutRefreshTokenInBody(AuthResponse authResponse) {
        return new AuthResponse(
                authResponse.accessToken(),
                null,
                authResponse.username(),
                authResponse.email(),
                authResponse.roles()
        );
    }
}
