package com.workflow.dto;

import java.util.Set;

public record UserDto(
    Long id,
    String username,
    String email,
    String fullName,
    boolean enabled,
    Set<String> roles
) {}
