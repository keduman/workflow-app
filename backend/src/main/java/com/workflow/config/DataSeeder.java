package com.workflow.config;

import com.workflow.model.*;
import com.workflow.repository.RoleRepository;
import com.workflow.repository.UserRepository;
import com.workflow.repository.WorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final String SAMPLE_WORKFLOW_NAME = "Sample Request";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final WorkflowRepository workflowRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (roleRepository.count() == 0) {
            Role adminRole = roleRepository.save(
                    Role.builder().name("ADMIN").description("Administrator").permissions(Set.of("ALL")).build());
            Role userRole = roleRepository.save(
                    Role.builder().name("USER").description("Default user").permissions(Set.of("READ", "EXECUTE"))
                            .build());

            if (!userRepository.existsByUsername("admin")) {
                User admin = User.builder()
                        .username("admin")
                        .email("admin@workflow.com")
                        .password(passwordEncoder.encode("admin123"))
                        .fullName("System Administrator")
                        .roles(Set.of(adminRole, userRole))
                        .build();
                userRepository.save(admin);
                log.info("Seeded admin user: admin / admin123");
            }
        }

        // Always ensure USER role exists (e.g. for "Assigned Role" dropdown in workflow designer)
        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(
                    Role.builder().name("USER").description("Default user").permissions(Set.of("READ", "EXECUTE")).build());
            log.info("Seeded missing USER role");
        }

        // Seed a regular user (USER role only) if not present
        roleRepository.findByName("USER").ifPresent(userRole -> {
            if (!userRepository.existsByUsername("user")) {
                User user = User.builder()
                        .username("user")
                        .email("user@workflow.com")
                        .password(passwordEncoder.encode("user123"))
                        .fullName("Demo User")
                        .roles(Set.of(userRole))
                        .build();
                userRepository.save(user);
                log.info("Seeded regular user: user / user123");
            }
        });

        seedSampleWorkflow();
    }

    private void seedSampleWorkflow() {
        if (workflowRepository.findAll().stream().anyMatch(w -> SAMPLE_WORKFLOW_NAME.equals(w.getName()))) {
            return;
        }
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            return;
        }

        Workflow workflow = Workflow.builder()
                .name(SAMPLE_WORKFLOW_NAME)
                .description("Submit a simple request with title, amount and description. Use this to test the workflow form and business rules.")
                .status(WorkflowStatus.DRAFT)
                .createdBy(admin)
                .build();
        workflow = workflowRepository.save(workflow);

        // Step 0: TASK with form (Submit Request)
        WorkflowStep stepSubmit = WorkflowStep.builder()
                .name("Submit Request")
                .description("Fill in the request details below.")
                .type(StepType.TASK)
                .stepOrder(0)
                .positionX(250.0)
                .positionY(0.0)
                .build();
        stepSubmit.addFormField(FormField.builder().label("Title").fieldKey("title").fieldType(FieldType.TEXT).required(true).placeholder("e.g. Office supplies").fieldOrder(0).build());
        stepSubmit.addFormField(FormField.builder().label("Amount").fieldKey("amount").fieldType(FieldType.NUMBER).required(true).placeholder("0").fieldOrder(1).build());
        stepSubmit.addFormField(FormField.builder().label("Description").fieldKey("description").fieldType(FieldType.TEXTAREA).required(false).placeholder("Optional details").fieldOrder(2).build());
        // Step-level business rules (evaluated when submitting this step)
        stepSubmit.addBusinessRule(BusinessRule.builder()
                .name("High value")
                .description("When amount is over 1000, require approval.")
                .conditionExpression("amount > 1000")
                .actionType("REQUIRE_APPROVAL")
                .ruleOrder(0)
                .build());
        stepSubmit.addBusinessRule(BusinessRule.builder()
                .name("Low value")
                .description("When amount is 1000 or less, auto-approve.")
                .conditionExpression("amount <= 1000")
                .actionType("AUTO_APPROVE")
                .ruleOrder(1)
                .build());
        workflow.addStep(stepSubmit);

        // Step 1: END (Done)
        WorkflowStep stepEnd = WorkflowStep.builder()
                .name("Done")
                .type(StepType.END)
                .stepOrder(1)
                .positionX(250.0)
                .positionY(120.0)
                .build();
        workflow.addStep(stepEnd);

        workflow = workflowRepository.save(workflow);

        workflow.setStatus(WorkflowStatus.PUBLISHED);
        workflowRepository.save(workflow);

        log.info("Seeded sample workflow: \"{}\" (2 steps, 3 form fields, 2 business rules). Publish and test from My Tasks.", SAMPLE_WORKFLOW_NAME);
    }
}
