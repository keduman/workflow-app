package com.workflow.dto;

import com.workflow.model.StepType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowStepDto implements Serializable {
    private Long id;

    @NotBlank
    private String name;

    private String description;
    private StepType type;
    private Integer stepOrder;
    private Long assignedRoleId;
    private String assignedRoleName;
    private Double positionX;
    private Double positionY;
    private String transitionTargets;
    private List<FormFieldDto> formFields;
    private List<BusinessRuleDto> businessRules;
}
