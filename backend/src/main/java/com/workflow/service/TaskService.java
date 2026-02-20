package com.workflow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workflow.dto.WorkflowInstanceDto;
import com.workflow.exception.BadRequestException;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.*;
import com.workflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final int MAX_FORM_DATA_LENGTH = 50_000;

    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowStepRepository stepRepository;
    private final UserRepository userRepository;
    private final BusinessRuleEvaluator ruleEvaluator;
    private final ObjectMapper objectMapper;

    @Transactional
    public WorkflowInstanceDto startWorkflow(Long workflowId, String username) {
        Workflow workflow = workflowRepository.findWithStepsById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + workflowId));

        if (workflow.getStatus() != WorkflowStatus.PUBLISHED) {
            throw new BadRequestException("Only published workflows can be started");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<WorkflowStep> steps = workflow.getSteps();
        WorkflowStep firstStep = steps.stream()
                .filter(s -> s.getType() == StepType.START || s.getStepOrder() == 0)
                .findFirst()
                .orElse(steps.isEmpty() ? null : steps.get(0));

        WorkflowInstance instance = WorkflowInstance.builder()
                .workflow(workflow)
                .currentStep(firstStep)
                .initiatedBy(user)
                .assignee(user)
                .status(InstanceStatus.IN_PROGRESS)
                .build();

        return toDto(instanceRepository.save(instance));
    }

    @Transactional(readOnly = true)
    public Page<WorkflowInstanceDto> getMyTasks(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return instanceRepository.findByAssigneeId(user.getId(), pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public WorkflowInstanceDto getTaskById(Long id, String username) {
        WorkflowInstance instance = instanceRepository.findByIdWithAssigneeAndInitiator(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
        ensureCanAccessTask(instance, username);
        return toDto(instance);
    }

    @Transactional
    public WorkflowInstanceDto submitStep(Long instanceId, Map<String, Object> formDataMap, String username) {
        WorkflowInstance instance = instanceRepository.findByIdWithAssigneeAndInitiator(instanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + instanceId));
        ensureCanAccessTask(instance, username);

        if (instance.getStatus() != InstanceStatus.IN_PROGRESS) {
            throw new BadRequestException("Task is not in progress");
        }

        Workflow workflow = instance.getWorkflow();
        if (workflow.getId() != null) {
            workflow = workflowRepository.findWithStepsById(workflow.getId()).orElse(workflow);
        }

        WorkflowStep currentStep = instance.getCurrentStep();
        if (currentStep != null && workflow.getSteps() != null) {
            WorkflowStep stepWithFields = workflow.getSteps().stream()
                    .filter(s -> s.getId().equals(currentStep.getId()))
                    .findFirst()
                    .orElse(currentStep);
            // Prefer step-level rules; fall back to workflow-level (legacy)
            List<BusinessRule> rulesToEvaluate = stepWithFields.getBusinessRules() != null && !stepWithFields.getBusinessRules().isEmpty()
                    ? stepWithFields.getBusinessRules()
                    : (workflow.getBusinessRules() != null ? workflow.getBusinessRules() : Collections.emptyList());
            if (!rulesToEvaluate.isEmpty()) {
                Map<String, Object> context = ruleEvaluator.buildContext(formDataMap, stepWithFields);
                String blockMessage = ruleEvaluator.evaluateBlockingRules(rulesToEvaluate, context);
                if (blockMessage != null) {
                    throw new BadRequestException(blockMessage);
                }
            }
        }

        // Serialize form data as JSON
        String formDataJson = serializeFormData(formDataMap);
        String existingData = instance.getFormData();
        if (existingData != null && !existingData.isEmpty()) {
            String combined = existingData + "|||" + formDataJson;
            if (combined.length() > MAX_FORM_DATA_LENGTH) {
                throw new BadRequestException("Accumulated form data exceeds maximum allowed size");
            }
            instance.setFormData(combined);
        } else {
            instance.setFormData(formDataJson);
        }

        // Advance to next step
        if (currentStep != null) {
            List<WorkflowStep> steps = stepRepository.findByWorkflowIdOrderByStepOrderAsc(
                    instance.getWorkflow().getId());

            int currentIndex = IntStream.range(0, steps.size())
                    .filter(i -> steps.get(i).getId().equals(currentStep.getId()))
                    .findFirst()
                    .orElse(-1);

            if (currentIndex >= 0 && currentIndex < steps.size() - 1) {
                WorkflowStep nextStep = steps.get(currentIndex + 1);
                instance.setCurrentStep(nextStep);

                if (nextStep.getType() == StepType.END) {
                    instance.setStatus(InstanceStatus.COMPLETED);
                    instance.setCompletedAt(LocalDateTime.now());
                }
            } else {
                // No more steps, complete
                instance.setStatus(InstanceStatus.COMPLETED);
                instance.setCompletedAt(LocalDateTime.now());
            }
        }

        return toDto(instanceRepository.save(instance));
    }

    @Transactional
    public WorkflowInstanceDto cancelTask(Long instanceId, String username) {
        WorkflowInstance instance = instanceRepository.findByIdWithAssigneeAndInitiator(instanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + instanceId));
        ensureCanAccessTask(instance, username);
        instance.setStatus(InstanceStatus.CANCELLED);
        return toDto(instanceRepository.save(instance));
    }

    private String serializeFormData(Map<String, Object> formDataMap) {
        if (formDataMap == null || formDataMap.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(formDataMap);
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Invalid form data format");
        }
    }

    /**
     * Check access using the already-fetched assignee/initiator on the instance,
     * only hitting the DB for the current user when the fast checks fail (admin check).
     */
    private void ensureCanAccessTask(WorkflowInstance instance, String username) {
        boolean isAssignee = instance.getAssignee() != null && username.equals(instance.getAssignee().getUsername());
        boolean isInitiator = instance.getInitiatedBy() != null && username.equals(instance.getInitiatedBy().getUsername());
        if (isAssignee || isInitiator) {
            return;
        }
        // Only query DB if we need to check admin role
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("User not found"));
        boolean isAdmin = currentUser.getRoles().stream().anyMatch(r -> "ADMIN".equalsIgnoreCase(r.getName()));
        if (!isAdmin) {
            throw new AccessDeniedException("Not authorized to access this task");
        }
    }

    private WorkflowInstanceDto toDto(WorkflowInstance instance) {
        return new WorkflowInstanceDto(
                instance.getId(),
                instance.getWorkflow().getId(),
                instance.getWorkflow().getName(),
                instance.getCurrentStep() != null ? instance.getCurrentStep().getId() : null,
                instance.getCurrentStep() != null ? instance.getCurrentStep().getName() : null,
                instance.getAssignee() != null ? instance.getAssignee().getUsername() : null,
                instance.getInitiatedBy() != null ? instance.getInitiatedBy().getUsername() : null,
                instance.getStatus(),
                instance.getFormData(),
                instance.getCreatedAt() != null ? instance.getCreatedAt().toString() : null,
                instance.getCompletedAt() != null ? instance.getCompletedAt().toString() : null
        );
    }
}
