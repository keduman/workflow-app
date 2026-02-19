package com.workflow.controller;

import com.workflow.dto.WorkflowDto;
import com.workflow.dto.WorkflowInstanceDto;
import com.workflow.service.TaskService;
import com.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final WorkflowService workflowService;

    @GetMapping("/workflows")
    public ResponseEntity<Page<WorkflowDto>> getPublishedWorkflows(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(workflowService.getPublishedWorkflows(pageable));
    }

    @GetMapping("/workflows/{workflowId}")
    public ResponseEntity<WorkflowDto> getPublishedWorkflow(@PathVariable Long workflowId) {
        return ResponseEntity.ok(workflowService.getPublishedWorkflow(workflowId));
    }

    @PostMapping("/start/{workflowId}")
    public ResponseEntity<WorkflowInstanceDto> startWorkflow(@PathVariable Long workflowId, Authentication auth) {
        return ResponseEntity.ok(taskService.startWorkflow(workflowId, auth.getName()));
    }

    @GetMapping
    public ResponseEntity<Page<WorkflowInstanceDto>> getMyTasks(
            Authentication auth, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(taskService.getMyTasks(auth.getName(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowInstanceDto> getTask(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<WorkflowInstanceDto> submitStep(
            @PathVariable Long id, @RequestBody Map<String, Object> formData, Authentication auth) {
        return ResponseEntity.ok(taskService.submitStep(id, formData.toString(), auth.getName()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<WorkflowInstanceDto> cancelTask(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.cancelTask(id));
    }
}
