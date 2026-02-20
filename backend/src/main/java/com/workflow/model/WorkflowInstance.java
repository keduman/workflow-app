package com.workflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_instances", indexes = {
        @Index(name = "idx_instance_workflow", columnList = "workflow_id"),
        @Index(name = "idx_instance_assignee", columnList = "assignee_id"),
        @Index(name = "idx_instance_initiator", columnList = "initiated_by"),
        @Index(name = "idx_instance_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_step_id")
    private WorkflowStep currentStep;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by")
    private User initiatedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InstanceStatus status = InstanceStatus.IN_PROGRESS;

    @Column(columnDefinition = "TEXT")
    private String formData; // JSON string of submitted form data

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;
}
