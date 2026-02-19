package com.workflow.dto;

import com.workflow.model.InstanceStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowInstanceDto {
    private Long id;
    private Long workflowId;
    private String workflowName;
    private Long currentStepId;
    private String currentStepName;
    private String assigneeUsername;
    private String initiatedByUsername;
    private InstanceStatus status;
    private String formData;
    private String createdAt;
    private String completedAt;
}
