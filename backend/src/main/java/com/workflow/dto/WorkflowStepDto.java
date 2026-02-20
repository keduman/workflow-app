package com.workflow.dto;

import com.workflow.model.StepType;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record WorkflowStepDto(
    Long id,
    @NotBlank String name,
    String description,
    StepType type,
    Integer stepOrder,
    Long assignedRoleId,
    String assignedRoleName,
    Double positionX,
    Double positionY,
    String transitionTargets,
    List<FormFieldDto> formFields,
    List<BusinessRuleDto> businessRules
) {}
