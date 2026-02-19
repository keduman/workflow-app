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
        if (workflow.getSteps() != null) {
            workflow.getSteps().forEach(s -> s.getBusinessRules().size()); // force-init step rules
        }
        workflow.getBusinessRules().size(); // force-init legacy workflow-level rules
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
        if (workflow.getSteps() != null) {
            workflow.getSteps().forEach(s -> s.getBusinessRules().size()); // force-init step rules
        }
        workflow.getBusinessRules().size(); // force-init legacy workflow-level rules
        return toDto(workflow);
    }

    @CacheEvict(value = "workflows", allEntries = true)
    @Transactional
    public WorkflowDto createWorkflow(WorkflowDto dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Workflow workflow = Workflow.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .status(WorkflowStatus.DRAFT)
                .createdBy(user)
                .build();

        if (dto.getSteps() != null) {
            for (WorkflowStepDto stepDto : dto.getSteps()) {
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

        workflow.setName(dto.getName());
        workflow.setDescription(dto.getDescription());

        if (dto.getStatus() != null) {
            workflow.setStatus(dto.getStatus());
        }

        // Update steps (and their form fields + business rules): clear and rebuild
        if (dto.getSteps() != null) {
            workflow.getSteps().clear();
            for (WorkflowStepDto stepDto : dto.getSteps()) {
                WorkflowStep step = mapStepFromDto(stepDto);
                if (stepDto.getId() != null) {
                    step.setId(stepDto.getId());
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
        if (workflow.getSteps() != null) {
            workflow.getSteps().forEach(s -> s.getBusinessRules().size());
        }
        workflow.setStatus(WorkflowStatus.PUBLISHED);
        return toDto(workflowRepository.save(workflow));
    }

    private WorkflowStep mapStepFromDto(WorkflowStepDto dto) {
        WorkflowStep step = WorkflowStep.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .type(dto.getType() != null ? dto.getType() : StepType.TASK)
                .stepOrder(dto.getStepOrder() != null ? dto.getStepOrder() : 0)
                .positionX(dto.getPositionX())
                .positionY(dto.getPositionY())
                .transitionTargets(dto.getTransitionTargets())
                .build();

        if (dto.getAssignedRoleId() != null) {
            roleRepository.findById(dto.getAssignedRoleId()).ifPresent(step::setAssignedRole);
        }

        if (dto.getFormFields() != null) {
            for (FormFieldDto fieldDto : dto.getFormFields()) {
                FormField field = FormField.builder()
                        .label(fieldDto.getLabel())
                        .fieldKey(fieldDto.getFieldKey())
                        .fieldType(fieldDto.getFieldType() != null ? fieldDto.getFieldType() : FieldType.TEXT)
                        .required(fieldDto.isRequired())
                        .placeholder(fieldDto.getPlaceholder())
                        .options(fieldDto.getOptions())
                        .validationRegex(fieldDto.getValidationRegex())
                        .fieldOrder(fieldDto.getFieldOrder() != null ? fieldDto.getFieldOrder() : 0)
                        .build();
                step.addFormField(field);
            }
        }

        if (dto.getBusinessRules() != null) {
            for (BusinessRuleDto ruleDto : dto.getBusinessRules()) {
                BusinessRule rule = mapRuleFromDto(ruleDto);
                if (ruleDto.getId() != null) {
                    rule.setId(ruleDto.getId());
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
                    .collect(Collectors.toList())
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

        return WorkflowDto.builder()
                .id(workflow.getId())
                .name(workflow.getName())
                .description(workflow.getDescription())
                .status(workflow.getStatus())
                .createdByUsername(workflow.getCreatedBy() != null ? workflow.getCreatedBy().getUsername() : null)
                .steps(stepDtos)
                .businessRules(ruleDtos)
                .createdAt(workflow.getCreatedAt() != null ? workflow.getCreatedAt().toString() : null)
                .build();
    }

    private BusinessRule mapRuleFromDto(BusinessRuleDto dto) {
        return BusinessRule.builder()
                .name(dto.getName() != null ? dto.getName() : "Rule")
                .description(dto.getDescription())
                .conditionExpression(dto.getConditionExpression())
                .actionType(dto.getActionType())
                .targetStepId(dto.getTargetStepId())
                .ruleOrder(dto.getRuleOrder() != null ? dto.getRuleOrder() : 0)
                .build();
    }

    private BusinessRuleDto ruleToDto(BusinessRule rule) {
        return BusinessRuleDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .conditionExpression(rule.getConditionExpression())
                .actionType(rule.getActionType())
                .targetStepId(rule.getTargetStepId())
                .ruleOrder(rule.getRuleOrder())
                .build();
    }

    private WorkflowStepDto stepToDto(WorkflowStep step) {
        List<FormFieldDto> fieldDtos = step.getFormFields() != null
                ? step.getFormFields().stream().map(this::fieldToDto).collect(Collectors.toList())
                : new ArrayList<>();
        List<BusinessRuleDto> ruleDtos = step.getBusinessRules() != null
                ? step.getBusinessRules().stream().map(this::ruleToDto).collect(Collectors.toList())
                : new ArrayList<>();

        return WorkflowStepDto.builder()
                .id(step.getId())
                .name(step.getName())
                .description(step.getDescription())
                .type(step.getType())
                .stepOrder(step.getStepOrder())
                .assignedRoleId(step.getAssignedRole() != null ? step.getAssignedRole().getId() : null)
                .assignedRoleName(step.getAssignedRole() != null ? step.getAssignedRole().getName() : null)
                .positionX(step.getPositionX())
                .positionY(step.getPositionY())
                .transitionTargets(step.getTransitionTargets())
                .formFields(fieldDtos)
                .businessRules(ruleDtos)
                .build();
    }

    private FormFieldDto fieldToDto(FormField field) {
        return FormFieldDto.builder()
                .id(field.getId())
                .label(field.getLabel())
                .fieldKey(field.getFieldKey())
                .fieldType(field.getFieldType())
                .required(field.isRequired())
                .placeholder(field.getPlaceholder())
                .options(field.getOptions())
                .validationRegex(field.getValidationRegex())
                .fieldOrder(field.getFieldOrder())
                .build();
    }
}
