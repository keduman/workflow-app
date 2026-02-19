package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Entity
@Table(name = "business_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessRule implements Serializable {

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

    /** Optional: step ID this rule applies to (null = workflow-level) */
    @Column(name = "target_step_id")
    private Long targetStepId;

    @Column(nullable = false)
    @Builder.Default
    private Integer ruleOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;
}
