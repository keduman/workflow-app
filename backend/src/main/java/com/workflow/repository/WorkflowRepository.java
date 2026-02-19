package com.workflow.repository;

import com.workflow.model.Workflow;
import com.workflow.model.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {

    @EntityGraph(attributePaths = { "steps", "steps.formFields" })
    Optional<Workflow> findWithStepsById(Long id);

    Page<Workflow> findByStatus(WorkflowStatus status, Pageable pageable);

    Page<Workflow> findByCreatedById(Long userId, Pageable pageable);
}
