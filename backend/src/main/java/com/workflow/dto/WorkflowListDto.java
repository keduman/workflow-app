package com.workflow.dto;

import com.workflow.model.WorkflowStatus;

public record WorkflowListDto(
    Long id,
    String name,
    String description,
    WorkflowStatus status,
    String createdByUsername,
    int stepCount
) {}
