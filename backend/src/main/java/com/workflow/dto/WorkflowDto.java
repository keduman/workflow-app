package com.workflow.dto;

import com.workflow.model.WorkflowStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WorkflowDto(
    Long id,
    @NotBlank @Size(max = 150) String name,
    @Size(max = 500) String description,
    WorkflowStatus status,
    String createdByUsername,
    List<WorkflowStepDto> steps,
    List<BusinessRuleDto> businessRules,
    String createdAt
) {}
