package com.workflow.dto;

import com.workflow.model.FieldType;
import jakarta.validation.constraints.NotBlank;

public record FormFieldDto(
    Long id,
    @NotBlank String label,
    String fieldKey,
    FieldType fieldType,
    boolean required,
    String placeholder,
    String options,
    String validationRegex,
    Integer fieldOrder
) {}
