package com.workflow.repository;

import com.workflow.model.FormField;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FormFieldRepository extends JpaRepository<FormField, Long> {
    List<FormField> findByStepIdOrderByFieldOrderAsc(Long stepId);

    void deleteByStepId(Long stepId);
}
