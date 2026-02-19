package com.workflow.service;

import com.workflow.model.BusinessRule;
import com.workflow.model.FormField;
import com.workflow.model.WorkflowStep;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.TypedValue;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Evaluates workflow business rules against submitted form data.
 * Supports condition expressions like "int1 > 5000", "amount <= 1000" using
 * field keys or form field labels as variables.
 */
@Component
public class BusinessRuleEvaluator {

    private static final ExpressionParser PARSER = new SpelExpressionParser();
    private static final Set<String> BLOCKING_ACTIONS = Set.of("REQUIRE_APPROVAL", "REJECT");

    /**
     * Build a context map for expression evaluation: form data by fieldKey,
     * plus each form field's label mapped to its value (so rules can use "int1" instead of "field_xxx").
     */
    public Map<String, Object> buildContext(Map<String, Object> formData, WorkflowStep currentStep) {
        Map<String, Object> context = new HashMap<>();
        if (formData != null) {
            for (Map.Entry<String, Object> e : formData.entrySet()) {
                Object v = e.getValue();
                if (v != null && !"".equals(v)) {
                    context.put(e.getKey(), coerceNumber(v));
                }
            }
        }
        if (currentStep != null && currentStep.getFormFields() != null) {
            for (FormField f : currentStep.getFormFields()) {
                String key = f.getFieldKey();
                if (key != null && formData != null && formData.containsKey(key)) {
                    Object val = formData.get(key);
                    if (val != null && !"".equals(val)) {
                        String label = asIdentifier(f.getLabel());
                        if (label != null && !context.containsKey(label)) {
                            context.put(label, coerceNumber(val));
                        }
                    }
                }
            }
        }
        return context;
    }

    private static String asIdentifier(String label) {
        if (label == null || label.isEmpty()) return null;
        String s = label.trim().replaceAll("\\s+", "_");
        if (s.matches("[a-zA-Z_][a-zA-Z0-9_]*")) return s;
        return null;
    }

    private static Object coerceNumber(Object v) {
        if (v instanceof Number) return v;
        if (v instanceof String) {
            String s = (String) v;
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {}
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {}
        }
        return v;
    }

    /**
     * Evaluate all rules. If any rule's condition is true and its action is blocking
     * (REQUIRE_APPROVAL, REJECT), returns that rule's message. Otherwise returns null.
     * Expressions can use field keys or labels, e.g. "int1 > 5000", "amount <= 1000".
     */
    public String evaluateBlockingRules(List<BusinessRule> rules, Map<String, Object> context) {
        if (rules == null || context == null) return null;
        StandardEvaluationContext evalContext = new StandardEvaluationContext(context);
        evalContext.addPropertyAccessor(new MapPropertyAccessor());
        for (BusinessRule rule : rules) {
            String expr = rule.getConditionExpression();
            if (expr == null || expr.isBlank() || !BLOCKING_ACTIONS.contains(rule.getActionType())) {
                continue;
            }
            try {
                Boolean result = PARSER.parseExpression(expr).getValue(evalContext, Boolean.class);
                if (Boolean.TRUE.equals(result)) {
                    String action = rule.getActionType();
                    String name = rule.getName() != null ? rule.getName() : "Rule";
                    if ("REJECT".equals(action)) {
                        return "Submission rejected by rule: " + name + (rule.getDescription() != null ? ". " + rule.getDescription() : "");
                    }
                    if ("REQUIRE_APPROVAL".equals(action)) {
                        return "This submission requires approval (rule: " + name + "). " + (rule.getDescription() != null ? rule.getDescription() : "");
                    }
                }
            } catch (Exception ignored) {
                // Invalid or unsupported expression: skip this rule
            }
        }
        return null;
    }

    /** Lets SpEL read Map entries as properties (e.g. "int1" when root is a Map). */
    private static class MapPropertyAccessor implements org.springframework.expression.PropertyAccessor {
        @Override
        public Class<?>[] getSpecificTargetClasses() {
            return new Class<?>[]{Map.class};
        }

        @Override
        public boolean canRead(@Nullable EvaluationContext context, @Nullable Object target, String name) {
            return target instanceof Map && ((Map<?, ?>) target).containsKey(name);
        }

        @Override
        public TypedValue read(@Nullable EvaluationContext context, @Nullable Object target, String name) {
            if (target instanceof Map) {
                Object value = ((Map<?, ?>) target).get(name);
                return new TypedValue(value);
            }
            return TypedValue.NULL;
        }

        @Override
        public boolean canWrite(@Nullable EvaluationContext context, @Nullable Object target, String name) {
            return false;
        }

        @Override
        public void write(@Nullable EvaluationContext context, @Nullable Object target, String name, @Nullable Object newValue) {
            // read-only
        }
    }
}
