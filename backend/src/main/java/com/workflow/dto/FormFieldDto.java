package com.workflow.dto;

import com.workflow.model.FieldType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormFieldDto implements Serializable {
    private Long id;

    @NotBlank
    private String label;

    private String fieldKey;
    private FieldType fieldType;
    private boolean required;
    private String placeholder;
    private String options;
    private String validationRegex;
    private Integer fieldOrder;
}
