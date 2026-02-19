import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FormField, FieldType } from '../types';

/** Parse options string: JSON array e.g. ["A","B"] or comma-separated */
function parseOptions(options: string | undefined): string[] {
    if (!options || !options.trim()) return [];
    const trimmed = options.trim();
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

interface DynamicStepFormProps {
    formFields: FormField[];
    formData: Record<string, string>;
    onChange: (data: Record<string, string>) => void;
    onSubmit: () => void;
    submitLabel?: string;
    submitting?: boolean;
}

export default function DynamicStepForm({
    formFields,
    formData,
    onChange,
    onSubmit,
    submitLabel = 'Submit & Advance',
    submitting = false,
}: DynamicStepFormProps) {
    const sortedFields = useMemo(
        () => [...formFields].sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0)),
        [formFields]
    );

    const setValue = (key: string, value: string) => {
        onChange({ ...formData, [key]: value });
    };

    const renderLabel = (field: FormField, index: number) => (
        <label className="form-label" htmlFor={`field-${field.fieldKey}-${index}`}>
            {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
    );

    const renderField = (field: FormField, index: number) => {
        const value = formData[field.fieldKey] ?? '';
        const options = parseOptions(field.options);
        const inputId = `field-${field.fieldKey}-${index}`;

        const commonInputProps = {
            id: inputId,
            required: field.required,
            placeholder: field.placeholder,
            disabled: submitting,
        };

        switch (field.fieldType as FieldType) {
            case 'TEXT':
                return (
                    <input
                        type="text"
                        className="form-input"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
            case 'TEXTAREA':
                return (
                    <textarea
                        className="form-textarea"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
            case 'NUMBER':
                return (
                    <input
                        type="number"
                        className="form-input"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
            case 'EMAIL':
                return (
                    <input
                        type="email"
                        className="form-input"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
            case 'DATE':
                return (
                    <input
                        type="date"
                        className="form-input"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
            case 'SELECT':
                return (
                    <select
                        className="form-select"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        disabled={submitting}
                        required={field.required}
                    >
                        <option value="">Select...</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'RADIO':
                return (
                    <div className="form-radio-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {renderLabel(field, index)}
                        {options.length ? options.map(opt => (
                            <label key={opt} className="form-checkbox-group" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="radio"
                                    name={field.fieldKey}
                                    className="form-checkbox"
                                    checked={value === opt}
                                    onChange={() => setValue(field.fieldKey, opt)}
                                    disabled={submitting}
                                />
                                <span>{opt}</span>
                            </label>
                        )) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No options defined</span>
                        )}
                    </div>
                );
            case 'CHECKBOX':
                return (
                    <label className="form-checkbox-group" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={value === 'true'}
                            onChange={e => setValue(field.fieldKey, String(e.target.checked))}
                            disabled={submitting}
                        />
                        <span>{field.placeholder || field.label}</span>
                    </label>
                );
            case 'FILE':
                return (
                    <div>
                        <input
                            type="file"
                            className="form-input"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setValue(field.fieldKey, file.name);
                            }}
                            disabled={submitting}
                        />
                        {value && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>Selected: {value}</p>}
                    </div>
                );
            default:
                return (
                    <input
                        type="text"
                        className="form-input"
                        value={value}
                        onChange={e => setValue(field.fieldKey, e.target.value)}
                        {...commonInputProps}
                    />
                );
        }
    };

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="step-form">
            <div className="step-form-fields">
                {sortedFields.map((field, idx) => (
                    <motion.div
                        key={field.fieldKey + String(field.id ?? idx)}
                        className="form-group"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                    >
                        {(field.fieldType as FieldType) !== 'RADIO' && (field.fieldType as FieldType) !== 'CHECKBOX' && renderLabel(field, idx)}
                        {renderField(field, idx)}
                    </motion.div>
                ))}
            </div>
            <div className="step-form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
