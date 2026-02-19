package com.workflow.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRuleDto {
    private Long id;
    private String name;
    private String description;
    private String conditionExpression;
    private String actionType;
    private Long targetStepId;
    private Integer ruleOrder;
}
