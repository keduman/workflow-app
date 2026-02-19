import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTaskQuery, useSubmitStepMutation, useGetPublishedWorkflowQuery } from '../store/api/taskApi';
import { motion } from 'framer-motion';
import type { FormField } from '../types';

export default function TaskExecutionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: task, isLoading } = useGetTaskQuery(Number(id));
    const { data: workflow } = useGetPublishedWorkflowQuery(task?.workflowId ?? 0, { skip: !task?.workflowId });
    const [submitStep] = useSubmitStepMutation();
    const [formData, setFormData] = useState<Record<string, string>>({});

    const currentStep = workflow?.steps.find(s => s.id === task?.currentStepId);

    useEffect(() => {
        if (currentStep) {
            const initial: Record<string, string> = {};
            currentStep.formFields.forEach(f => { initial[f.fieldKey] = ''; });
            setFormData(initial);
        }
    }, [currentStep]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitStep({ id: Number(id), formData }).unwrap();
    };

    if (isLoading) return <div className="loading-container"><div className="spinner" /></div>;
    if (!task) return <div className="card"><div className="empty-state"><p>Task not found</p></div></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{task.workflowName}</h1>
                    <p className="page-subtitle">
                        {task.status === 'COMPLETED' ? 'This workflow has been completed' :
                            task.status === 'CANCELLED' ? 'This workflow was cancelled' :
                                `Current step: ${task.currentStepName || 'N/A'}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className={`badge badge-${task.status.toLowerCase().replace('_', '-')}`}>{task.status}</span>
                    <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>Back to Tasks</button>
                </div>
            </div>

            {workflow?.businessRules && workflow.businessRules.length > 0 && task.status === 'IN_PROGRESS' && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">Rules for this workflow</h3>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {workflow.businessRules.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{rule.name}</strong>
                                {rule.conditionExpression && <span> — when {rule.conditionExpression}</span>}
                                {rule.actionType && <span> → {rule.actionType.replace(/_/g, ' ').toLowerCase()}</span>}
                                {rule.description && <span style={{ display: 'block', marginTop: 2, fontSize: '0.85rem' }}>{rule.description}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {task.status === 'IN_PROGRESS' && currentStep ? (
                <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">{currentStep.name}</h3>
                            {currentStep.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>{currentStep.description}</p>}
                        </div>
                        <span className={`badge badge-${currentStep.type.toLowerCase()}`}>{currentStep.type}</span>
                    </div>

                    {currentStep.formFields.length > 0 ? (
                        <form onSubmit={handleSubmit}>
                            {currentStep.formFields.map((field: FormField, idx: number) => (
                                <motion.div key={idx} className="form-group" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                    <label className="form-label">
                                        {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                                    </label>
                                    {field.fieldType === 'TEXT' || field.fieldType === 'EMAIL' || field.fieldType === 'NUMBER' || field.fieldType === 'DATE' ? (
                                        <input
                                            className="form-input"
                                            type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'EMAIL' ? 'email' : field.fieldType === 'DATE' ? 'date' : 'text'}
                                            value={formData[field.fieldKey] || ''}
                                            onChange={e => setFormData(d => ({ ...d, [field.fieldKey]: e.target.value }))}
                                            placeholder={field.placeholder || ''}
                                            required={field.required}
                                        />
                                    ) : field.fieldType === 'TEXTAREA' ? (
                                        <textarea
                                            className="form-textarea"
                                            value={formData[field.fieldKey] || ''}
                                            onChange={e => setFormData(d => ({ ...d, [field.fieldKey]: e.target.value }))}
                                            placeholder={field.placeholder || ''}
                                            required={field.required}
                                        />
                                    ) : field.fieldType === 'SELECT' ? (
                                        <select
                                            className="form-select"
                                            value={formData[field.fieldKey] || ''}
                                            onChange={e => setFormData(d => ({ ...d, [field.fieldKey]: e.target.value }))}
                                            required={field.required}
                                        >
                                            <option value="">Select...</option>
                                            {field.options?.split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                                        </select>
                                    ) : field.fieldType === 'CHECKBOX' ? (
                                        <label className="form-checkbox-group">
                                            <input type="checkbox" className="form-checkbox" checked={formData[field.fieldKey] === 'true'} onChange={e => setFormData(d => ({ ...d, [field.fieldKey]: String(e.target.checked) }))} />
                                            <span>{field.placeholder || field.label}</span>
                                        </label>
                                    ) : (
                                        <input
                                            className="form-input"
                                            value={formData[field.fieldKey] || ''}
                                            onChange={e => setFormData(d => ({ ...d, [field.fieldKey]: e.target.value }))}
                                            placeholder={field.placeholder || ''}
                                            required={field.required}
                                        />
                                    )}
                                </motion.div>
                            ))}
                            <button className="btn btn-primary" type="submit" style={{ marginTop: 8 }}>Submit & Advance</button>
                        </form>
                    ) : (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No form fields for this step. Click to advance.</p>
                            <button className="btn btn-primary" onClick={() => submitStep({ id: Number(id), formData: {} })}>Advance to Next Step</button>
                        </div>
                    )}
                </motion.div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <h3>{task.status === 'COMPLETED' ? '✅ Workflow Complete' : '❌ Workflow Cancelled'}</h3>
                        <p>{task.status === 'COMPLETED' ? 'All steps have been successfully completed.' : 'This workflow was cancelled.'}</p>
                    </div>
                </div>
            )}

            {task.formData && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">Submitted Data</h3>
                    </div>
                    <pre style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'auto' }}>
                        {task.formData}
                    </pre>
                </div>
            )}
        </div>
    );
}
