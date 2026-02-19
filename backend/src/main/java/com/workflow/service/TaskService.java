package com.workflow.service;

import com.workflow.dto.WorkflowInstanceDto;
import com.workflow.exception.BadRequestException;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.*;
import com.workflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowRepository workflowRepository;
    private final WorkflowStepRepository stepRepository;
    private final UserRepository userRepository;

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
    public WorkflowInstanceDto getTaskById(Long id) {
        return toDto(instanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id)));
    }

    @Transactional
    public WorkflowInstanceDto submitStep(Long instanceId, String formData, String username) {
        WorkflowInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + instanceId));

        if (instance.getStatus() != InstanceStatus.IN_PROGRESS) {
            throw new BadRequestException("Task is not in progress");
        }

        // Append form data
        String existingData = instance.getFormData();
        if (existingData != null && !existingData.isEmpty()) {
            instance.setFormData(existingData + "|||" + formData);
        } else {
            instance.setFormData(formData);
        }

        // Advance to next step
        WorkflowStep currentStep = instance.getCurrentStep();
        if (currentStep != null) {
            List<WorkflowStep> steps = stepRepository.findByWorkflowIdOrderByStepOrderAsc(
                    instance.getWorkflow().getId());

            int currentIndex = -1;
            for (int i = 0; i < steps.size(); i++) {
                if (steps.get(i).getId().equals(currentStep.getId())) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex >= 0 && currentIndex < steps.size() - 1) {
                WorkflowStep nextStep = steps.get(currentIndex + 1);
                instance.setCurrentStep(nextStep);

                // If next step has a role, try to keep same assignee or auto-assign
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
    public WorkflowInstanceDto cancelTask(Long instanceId) {
        WorkflowInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + instanceId));
        instance.setStatus(InstanceStatus.CANCELLED);
        return toDto(instanceRepository.save(instance));
    }

    private WorkflowInstanceDto toDto(WorkflowInstance instance) {
        return WorkflowInstanceDto.builder()
                .id(instance.getId())
                .workflowId(instance.getWorkflow().getId())
                .workflowName(instance.getWorkflow().getName())
                .currentStepId(instance.getCurrentStep() != null ? instance.getCurrentStep().getId() : null)
                .currentStepName(instance.getCurrentStep() != null ? instance.getCurrentStep().getName() : null)
                .assigneeUsername(instance.getAssignee() != null ? instance.getAssignee().getUsername() : null)
                .initiatedByUsername(instance.getInitiatedBy() != null ? instance.getInitiatedBy().getUsername() : null)
                .status(instance.getStatus())
                .formData(instance.getFormData())
                .createdAt(instance.getCreatedAt() != null ? instance.getCreatedAt().toString() : null)
                .completedAt(instance.getCompletedAt() != null ? instance.getCompletedAt().toString() : null)
                .build();
    }
}
