package com.workflow.service;

import com.workflow.dto.WorkflowDto;
import com.workflow.dto.WorkflowListDto;
import com.workflow.dto.WorkflowStepDto;
import com.workflow.dto.FormFieldDto;
import com.workflow.dto.BusinessRuleDto;
import com.workflow.exception.BadRequestException;
import com.workflow.exception.ResourceNotFoundException;
import com.workflow.model.BusinessRule;
import com.workflow.model.FieldType;
import com.workflow.model.FormField;
import com.workflow.model.StepType;
import com.workflow.model.User;
import com.workflow.model.Workflow;
import com.workflow.model.WorkflowStep;
import com.workflow.model.WorkflowStatus;
import com.workflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowStepRepository stepRepository;
    private final FormFieldRepository formFieldRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Cacheable(value = "workflows", key = "#id")
    @Transactional(readOnly = true)
    public WorkflowDto getWorkflow(Long id) {
        Workflow workflow = workflowRepository.findWithStepsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        return toDto(workflow);
    }

    @Transactional(readOnly = true)
    public Page<WorkflowListDto> getAllWorkflows(Pageable pageable) {
        return workflowRepository.findAllList(pageable);
    }

    @Transactional(readOnly = true)
    public Page<WorkflowListDto> getPublishedWorkflows(Pageable pageable) {
        return workflowRepository.findByStatusList(WorkflowStatus.PUBLISHED, pageable);
    }

    /** Returns workflow details only if published (for users to load form when executing a task). */
    @Transactional(readOnly = true)
    public WorkflowDto getPublishedWorkflow(Long id) {
        Workflow workflow = workflowRepository.findWithStepsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        if (workflow.getStatus() != WorkflowStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Workflow not found: " + id);
        }
        return toDto(workflow);
    }

    @CacheEvict(value = "workflows", allEntries = true)
    @Transactional
    public WorkflowDto createWorkflow(WorkflowDto dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Workflow workflow = Workflow.builder()
                .name(dto.name())
                .description(dto.description())
                .status(WorkflowStatus.DRAFT)
                .createdBy(user)
                .build();

        if (dto.steps() != null) {
            for (WorkflowStepDto stepDto : dto.steps()) {
                WorkflowStep step = mapStepFromDto(stepDto);
                workflow.addStep(step);
            }
        }

        Workflow saved = workflowRepository.save(workflow);
        return toDto(saved);
    }

    @CacheEvict(value = "workflows", key = "#id")
    @Transactional
    public WorkflowDto updateWorkflow(Long id, WorkflowDto dto) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));

        workflow.setName(dto.name());
        workflow.setDescription(dto.description());

        if (dto.status() != null) {
            workflow.setStatus(dto.status());
        }

        // Update steps (and their form fields + business rules): clear and rebuild
        if (dto.steps() != null) {
            workflow.getSteps().clear();
            for (WorkflowStepDto stepDto : dto.steps()) {
                WorkflowStep step = mapStepFromDto(stepDto);
                if (stepDto.id() != null) {
                    step.setId(stepDto.id());
                }
                workflow.addStep(step);
            }
        }

        Workflow saved = workflowRepository.save(workflow);
        return toDto(saved);
    }

    @CacheEvict(value = "workflows", key = "#id")
    @Transactional
    public void deleteWorkflow(Long id) {
        if (!workflowRepository.existsById(id)) {
            throw new ResourceNotFoundException("Workflow not found: " + id);
        }
        workflowRepository.deleteById(id);
    }

    @CacheEvict(value = "workflows", key = "#id")
    @Transactional
    public WorkflowDto publishWorkflow(Long id) {
        Workflow workflow = workflowRepository.findWithStepsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow not found: " + id));
        if (workflow.getSteps() == null || workflow.getSteps().isEmpty()) {
            throw new BadRequestException("Workflow must have at least one step before publishing");
        }
        workflow.setStatus(WorkflowStatus.PUBLISHED);
        return toDto(workflowRepository.save(workflow));
    }

    private WorkflowStep mapStepFromDto(WorkflowStepDto dto) {
        WorkflowStep step = WorkflowStep.builder()
                .name(dto.name())
                .description(dto.description())
                .type(dto.type() != null ? dto.type() : StepType.TASK)
                .stepOrder(dto.stepOrder() != null ? dto.stepOrder() : 0)
                .positionX(dto.positionX())
                .positionY(dto.positionY())
                .transitionTargets(dto.transitionTargets())
                .build();

        if (dto.assignedRoleId() != null) {
            roleRepository.findById(dto.assignedRoleId()).ifPresent(step::setAssignedRole);
        }

        if (dto.formFields() != null) {
            for (FormFieldDto fieldDto : dto.formFields()) {
                FormField field = FormField.builder()
                        .label(fieldDto.label())
                        .fieldKey(fieldDto.fieldKey())
                        .fieldType(fieldDto.fieldType() != null ? fieldDto.fieldType() : FieldType.TEXT)
                        .required(fieldDto.required())
                        .placeholder(fieldDto.placeholder())
                        .options(fieldDto.options())
                        .validationRegex(fieldDto.validationRegex())
                        .fieldOrder(fieldDto.fieldOrder() != null ? fieldDto.fieldOrder() : 0)
                        .build();
                step.addFormField(field);
            }
        }

        if (dto.businessRules() != null) {
            for (BusinessRuleDto ruleDto : dto.businessRules()) {
                BusinessRule rule = mapRuleFromDto(ruleDto);
                if (ruleDto.id() != null) {
                    rule.setId(ruleDto.id());
                }
                step.addBusinessRule(rule);
            }
        }

        return step;
    }

    private WorkflowDto toDto(Workflow workflow) {
        List<WorkflowStepDto> stepDtos = workflow.getSteps() != null
                ? workflow.getSteps().stream()
                    .collect(Collectors.toMap(WorkflowStep::getId, s -> s, (a, b) -> a, java.util.LinkedHashMap::new))
                    .values().stream()
                    .map(this::stepToDto)
                    .toList()
                : new ArrayList<>();
        // Aggregate all step-level rules for backward compatibility (workflow.businessRules)
        List<BusinessRuleDto> ruleDtos = new ArrayList<>();
        if (workflow.getSteps() != null) {
            for (WorkflowStep s : workflow.getSteps()) {
                if (s.getBusinessRules() != null) {
                    for (BusinessRule r : s.getBusinessRules()) {
                        ruleDtos.add(ruleToDto(r));
                    }
                }
            }
        }
        // Legacy workflow-level rules (no step)
        if (workflow.getBusinessRules() != null) {
            for (BusinessRule r : workflow.getBusinessRules()) {
                if (r.getStep() == null) {
                    ruleDtos.add(ruleToDto(r));
                }
            }
        }

        return new WorkflowDto(
                workflow.getId(),
                workflow.getName(),
                workflow.getDescription(),
                workflow.getStatus(),
                workflow.getCreatedBy() != null ? workflow.getCreatedBy().getUsername() : null,
                stepDtos,
                ruleDtos,
                workflow.getCreatedAt() != null ? workflow.getCreatedAt().toString() : null
        );
    }

    private BusinessRule mapRuleFromDto(BusinessRuleDto dto) {
        return BusinessRule.builder()
                .name(dto.name() != null ? dto.name() : "Rule")
                .description(dto.description())
                .conditionExpression(dto.conditionExpression())
                .actionType(dto.actionType())
                .targetStepId(dto.targetStepId())
                .ruleOrder(dto.ruleOrder() != null ? dto.ruleOrder() : 0)
                .build();
    }

    private BusinessRuleDto ruleToDto(BusinessRule rule) {
        return new BusinessRuleDto(
                rule.getId(),
                rule.getName(),
                rule.getDescription(),
                rule.getConditionExpression(),
                rule.getActionType(),
                rule.getTargetStepId(),
                rule.getRuleOrder()
        );
    }

    private WorkflowStepDto stepToDto(WorkflowStep step) {
        List<FormFieldDto> fieldDtos = step.getFormFields() != null
                ? step.getFormFields().stream().map(this::fieldToDto).toList()
                : new ArrayList<>();
        List<BusinessRuleDto> ruleDtos = step.getBusinessRules() != null
                ? step.getBusinessRules().stream().map(this::ruleToDto).toList()
                : new ArrayList<>();

        return new WorkflowStepDto(
                step.getId(),
                step.getName(),
                step.getDescription(),
                step.getType(),
                step.getStepOrder(),
                step.getAssignedRole() != null ? step.getAssignedRole().getId() : null,
                step.getAssignedRole() != null ? step.getAssignedRole().getName() : null,
                step.getPositionX(),
                step.getPositionY(),
                step.getTransitionTargets(),
                fieldDtos,
                ruleDtos
        );
    }

    private FormFieldDto fieldToDto(FormField field) {
        return new FormFieldDto(
                field.getId(),
                field.getLabel(),
                field.getFieldKey(),
                field.getFieldType(),
                field.isRequired(),
                field.getPlaceholder(),
                field.getOptions(),
                field.getValidationRegex(),
                field.getFieldOrder()
        );
    }
}
