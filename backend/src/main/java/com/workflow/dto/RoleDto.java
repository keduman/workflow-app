package com.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;

public record RoleDto(
    Long id,
    @NotBlank String name,
    String description,
    Set<String> permissions
) {}
