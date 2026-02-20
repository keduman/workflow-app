package com.workflow.repository;

import com.workflow.model.InstanceStatus;
import com.workflow.model.WorkflowInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Page<WorkflowInstance> findByAssigneeIdAndStatus(Long assigneeId, InstanceStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"workflow", "currentStep", "assignee", "initiatedBy"})
    Page<WorkflowInstance> findByAssigneeId(Long assigneeId, Pageable pageable);

    Page<WorkflowInstance> findByInitiatedById(Long userId, Pageable pageable);

    @Query("""
            SELECT i FROM WorkflowInstance i
            LEFT JOIN FETCH i.workflow
            LEFT JOIN FETCH i.currentStep
            LEFT JOIN FETCH i.assignee
            LEFT JOIN FETCH i.initiatedBy
            WHERE i.id = :id
            """)
    Optional<WorkflowInstance> findByIdWithAssigneeAndInitiator(@Param("id") Long id);
}
