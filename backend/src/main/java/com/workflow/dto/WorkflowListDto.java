package com.workflow.dto;

import com.workflow.model.WorkflowStatus;
import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowListDto implements Serializable {
    private Long id;
    private String name;
    private String description;
    private WorkflowStatus status;
    private String createdByUsername;
    private int stepCount;
}
