package com.workflow.dto;

import com.workflow.model.InstanceStatus;

public record WorkflowInstanceDto(
    Long id,
    Long workflowId,
    String workflowName,
    Long currentStepId,
    String currentStepName,
    String assigneeUsername,
    String initiatedByUsername,
    InstanceStatus status,
    String formData,
    String createdAt,
    String completedAt
) {}
