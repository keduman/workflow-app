package com.workflow.controller;

import com.workflow.dto.WorkflowDto;
import com.workflow.dto.WorkflowListDto;
import com.workflow.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/workflows")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    public ResponseEntity<Page<WorkflowListDto>> getAll(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(workflowService.getAllWorkflows(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(workflowService.getWorkflow(id));
    }

    @PostMapping
    public ResponseEntity<WorkflowDto> create(@Valid @RequestBody WorkflowDto dto, Authentication auth) {
        return ResponseEntity.ok(workflowService.createWorkflow(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkflowDto> update(@PathVariable Long id, @Valid @RequestBody WorkflowDto dto) {
        return ResponseEntity.ok(workflowService.updateWorkflow(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        workflowService.deleteWorkflow(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<WorkflowDto> publish(@PathVariable Long id) {
        return ResponseEntity.ok(workflowService.publishWorkflow(id));
    }
}
