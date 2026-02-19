package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Entity
@Table(name = "form_fields")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormField implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(length = 100)
    private String fieldKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FieldType fieldType = FieldType.TEXT;

    @Builder.Default
    private boolean required = false;

    @Column(length = 500)
    private String placeholder;

    @Column(length = 1000)
    private String options; // JSON array for SELECT, RADIO, CHECKBOX

    @Column(length = 500)
    private String validationRegex;

    @Column(nullable = false)
    @Builder.Default
    private Integer fieldOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id", nullable = false)
    private WorkflowStep step;
}
