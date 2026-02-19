package com.workflow.repository;

import com.workflow.dto.WorkflowListDto;
import com.workflow.model.Workflow;
import com.workflow.model.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {

    @Query("SELECT DISTINCT w FROM Workflow w " +
           "LEFT JOIN FETCH w.steps s " +
           "LEFT JOIN FETCH s.formFields " +
           "LEFT JOIN FETCH s.assignedRole " +
           "WHERE w.id = :id")
    Optional<Workflow> findWithStepsById(@Param("id") Long id);

    Page<Workflow> findByStatus(WorkflowStatus status, Pageable pageable);

    Page<Workflow> findByCreatedById(Long userId, Pageable pageable);

    @Query(value = "SELECT new com.workflow.dto.WorkflowListDto(w.id, w.name, w.description, w.status, u.username, size(w.steps)) " +
           "FROM Workflow w LEFT JOIN w.createdBy u",
           countQuery = "SELECT count(w) FROM Workflow w")
    Page<WorkflowListDto> findAllList(Pageable pageable);

    @Query(value = "SELECT new com.workflow.dto.WorkflowListDto(w.id, w.name, w.description, w.status, u.username, size(w.steps)) " +
           "FROM Workflow w LEFT JOIN w.createdBy u WHERE w.status = :status",
           countQuery = "SELECT count(w) FROM Workflow w WHERE w.status = :status")
    Page<WorkflowListDto> findByStatusList(@Param("status") WorkflowStatus status, Pageable pageable);
}
