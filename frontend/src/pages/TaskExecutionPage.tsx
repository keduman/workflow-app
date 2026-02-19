import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTaskQuery, useSubmitStepMutation, useGetPublishedWorkflowQuery } from '../store/api/taskApi';
import { motion } from 'framer-motion';
import DynamicStepForm from '../components/DynamicStepForm';

export default function TaskExecutionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: task, isLoading } = useGetTaskQuery(Number(id));
    const { data: workflow } = useGetPublishedWorkflowQuery(task?.workflowId ?? 0, { skip: !task?.workflowId });
    const [submitStep, { isLoading: submitting }] = useSubmitStepMutation();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const currentStep = workflow?.steps?.find(s => s.id === task?.currentStepId);
    const formFields = currentStep?.formFields ?? [];

    useEffect(() => {
        setSubmitError(null);
        if (currentStep && currentStep.formFields) {
            const initial: Record<string, string> = {};
            currentStep.formFields.forEach(f => { initial[f.fieldKey] = ''; });
            setFormData(initial);
        }
    }, [currentStep]);

    const handleSubmit = async () => {
        setSubmitError(null);
        try {
            await submitStep({ id: Number(id), formData }).unwrap();
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'data' in e && e.data && typeof e.data === 'object' && 'message' in e.data
                ? String((e.data as { message: string }).message)
                : 'Submission failed. Please try again.';
            setSubmitError(msg);
        }
    };

    const handleAdvanceNoFields = () => {
        submitStep({ id: Number(id), formData: {} });
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

            {(() => {
                const rulesToShow = (currentStep?.businessRules?.length ? currentStep.businessRules : workflow?.businessRules) ?? [];
                return rulesToShow.length > 0 && task.status === 'IN_PROGRESS' && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">Rules for this step</h3>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {rulesToShow.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{rule.name}</strong>
                                {rule.conditionExpression && <span> — when {rule.conditionExpression}</span>}
                                {rule.actionType && <span> → {rule.actionType.replace(/_/g, ' ').toLowerCase()}</span>}
                                {rule.description && <span style={{ display: 'block', marginTop: 2, fontSize: '0.85rem' }}>{rule.description}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            ); })()}

            {task.status === 'IN_PROGRESS' && currentStep ? (
                <motion.div className="card card-step-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">{currentStep.name}</h3>
                            {currentStep.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>{currentStep.description}</p>}
                        </div>
                        <span className={`badge badge-${currentStep.type.toLowerCase()}`}>{currentStep.type}</span>
                    </div>

                    {formFields.length > 0 ? (
                        <div className="step-form-wrapper">
                            {submitError && (
                                <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #b91c1c)', fontSize: '0.9rem' }}>
                                    {submitError}
                                </div>
                            )}
                            <p className="step-form-intro">
                                Fill in the attributes below. These fields were defined by the workflow admin for this step.
                            </p>
                            <DynamicStepForm
                                formFields={formFields}
                                formData={formData}
                                onChange={setFormData}
                                onSubmit={handleSubmit}
                                submitLabel="Submit & Advance"
                                submitting={submitting}
                            />
                        </div>
                    ) : (
                        <div className="step-form-wrapper">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No form fields for this step. Click to advance.</p>
                            <button className="btn btn-primary" onClick={handleAdvanceNoFields} disabled={submitting}>
                                {submitting ? 'Advancing…' : 'Advance to Next Step'}
                            </button>
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
