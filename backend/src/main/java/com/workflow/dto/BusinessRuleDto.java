package com.workflow.dto;

public record BusinessRuleDto(
    Long id,
    String name,
    String description,
    String conditionExpression,
    String actionType,
    Long targetStepId,
    Integer ruleOrder
) {}
