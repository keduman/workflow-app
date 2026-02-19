package com.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDto {
    private Long id;

    @NotBlank
    private String name;

    private String description;
    private Set<String> permissions;
}
