package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflows", indexes = {
        @Index(name = "idx_workflow_status", columnList = "status"),
        @Index(name = "idx_workflow_created_by", columnList = "created_by")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workflow {

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
    private WorkflowStatus status = WorkflowStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
    @Builder.Default
    private List<WorkflowStep> steps = new ArrayList<>();

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ruleOrder ASC")
    @BatchSize(size = 20)
    @Builder.Default
    private List<BusinessRule> businessRules = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void addStep(WorkflowStep step) {
        steps.add(step);
        step.setWorkflow(this);
        if (step.getBusinessRules() != null) {
            for (BusinessRule rule : step.getBusinessRules()) {
                rule.setWorkflow(this);
            }
        }
    }

    public void removeStep(WorkflowStep step) {
        steps.remove(step);
        step.setWorkflow(null);
    }

    public void addBusinessRule(BusinessRule rule) {
        businessRules.add(rule);
        rule.setWorkflow(this);
    }

    public void removeBusinessRule(BusinessRule rule) {
        businessRules.remove(rule);
        rule.setWorkflow(null);
    }
}
