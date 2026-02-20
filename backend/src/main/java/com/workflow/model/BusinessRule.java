package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "business_rules", indexes = {
        @Index(name = "idx_rule_workflow", columnList = "workflow_id"),
        @Index(name = "idx_rule_step", columnList = "step_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    /** Condition expression, e.g. "amount > 1000", "status == 'PENDING'" */
    @Column(name = "condition_expression", length = 1000)
    private String conditionExpression;

    /** Action to take when condition is met, e.g. "REQUIRE_APPROVAL", "NOTIFY_ADMIN" */
    @Column(name = "action_type", length = 100)
    private String actionType;

    /** Optional: step ID this rule applies to (null = workflow-level) - deprecated, use step relation */
    @Column(name = "target_step_id")
    private Long targetStepId;

    @Column(nullable = false)
    @Builder.Default
    private Integer ruleOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id")
    private Workflow workflow;

    /** Step this rule belongs to (step-level rules). When set, rule is evaluated only on that step. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id")
    private WorkflowStep step;
}
