package com.workflow.repository;

import com.workflow.model.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByWorkflowIdOrderByStepOrderAsc(Long workflowId);
}
