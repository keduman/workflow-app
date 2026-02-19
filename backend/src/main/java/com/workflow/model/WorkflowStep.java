package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "workflow_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowStep implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StepType type = StepType.TASK;

    @Column(nullable = false)
    private Integer stepOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @OneToMany(mappedBy = "step", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fieldOrder ASC")
    @Builder.Default
    private Set<FormField> formFields = new LinkedHashSet<>();

    @OneToMany(mappedBy = "step", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ruleOrder ASC")
    @Builder.Default
    private List<BusinessRule> businessRules = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_role_id")
    private Role assignedRole;

    // Position data for frontend canvas (React Flow)
    private Double positionX;
    private Double positionY;

    // Transition targets stored as comma-separated step IDs
    @Column(length = 1000)
    private String transitionTargets;

    public void addFormField(FormField field) {
        formFields.add(field);
        field.setStep(this);
    }

    public void removeFormField(FormField field) {
        formFields.remove(field);
        field.setStep(null);
    }

    public void addBusinessRule(BusinessRule rule) {
        businessRules.add(rule);
        rule.setStep(this);
    }

    public void removeBusinessRule(BusinessRule rule) {
        businessRules.remove(rule);
        rule.setStep(null);
    }
}
