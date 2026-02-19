package com.workflow.dto;

import com.workflow.model.WorkflowStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowDto implements Serializable {
    private Long id;

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 500)
    private String description;

    private WorkflowStatus status;
    private String createdByUsername;
    private List<WorkflowStepDto> steps;
    private List<BusinessRuleDto> businessRules;
    private String createdAt;
}
