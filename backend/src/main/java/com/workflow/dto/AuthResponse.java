package com.workflow.dto;

import java.util.Set;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String username,
    String email,
    Set<String> roles
) {}
