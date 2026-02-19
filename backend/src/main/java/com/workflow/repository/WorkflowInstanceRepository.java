package com.workflow.repository;

import com.workflow.model.InstanceStatus;
import com.workflow.model.WorkflowInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Page<WorkflowInstance> findByAssigneeIdAndStatus(Long assigneeId, InstanceStatus status, Pageable pageable);

    Page<WorkflowInstance> findByAssigneeId(Long assigneeId, Pageable pageable);

    Page<WorkflowInstance> findByInitiatedById(Long userId, Pageable pageable);
}
