import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type Connection,
    type Node,
    type Edge,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGetWorkflowQuery, useUpdateWorkflowMutation, useCreateWorkflowMutation } from '../store/api/workflowApi';
import { useGetRolesForAssignmentQuery } from '../store/api/roleApi';
import { sampleRestrictions, sampleRules, sampleAttributes } from '../data/workflowSamples';
import type { WorkflowStep, FormField, BusinessRule, StepType, FieldType } from '../types';

function CustomNode({ data }: { data: { label: string; type: string; onSelect: () => void } }) {
    return (
        <div className={`workflow-node ${data.type.toLowerCase()}`} onClick={data.onSelect}>
            <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)' }} />
            <div className="node-type">{data.type}</div>
            <div className="node-title">{data.label}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)' }} />
        </div>
    );
}

const nodeTypes = { custom: CustomNode };

export default function WorkflowDesigner() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const { data: workflow } = useGetWorkflowQuery(Number(id), { skip: isNew });
    const { data: roleList, isLoading: rolesLoading, isError: rolesError, error: rolesErrorDetail } = useGetRolesForAssignmentQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });

    if (rolesError) {
        console.error('[WorkflowDesigner] Failed to load roles:', rolesErrorDetail);
    }
    const [updateWorkflow] = useUpdateWorkflowMutation();
    const [createWorkflow] = useCreateWorkflowMutation();

    const [workflowName, setWorkflowName] = useState(workflow?.name || '');
    const [workflowDesc, setWorkflowDesc] = useState(workflow?.description || '');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [showFormEditor, setShowFormEditor] = useState(false);
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showSamplesPanel, setShowSamplesPanel] = useState(false);

    // Sync when workflow loads (admin edit); rules are per-step (step.businessRules)
    useEffect(() => {
        if (workflow) {
            setWorkflowName(workflow.name);
            setWorkflowDesc(workflow.description ?? '');
            setSteps((workflow.steps ?? []).map(s => ({ ...s, businessRules: s.businessRules ?? [] })));
        } else if (isNew) {
            setWorkflowName('');
            setWorkflowDesc('');
            setSteps([]);
        }
    }, [workflow, isNew]);

    const initialNodes: Node[] = steps.map((s, i) => ({
        id: String(s.id || `temp-${i}`),
        type: 'custom',
        position: { x: s.positionX ?? 250, y: s.positionY ?? i * 120 },
        data: { label: s.name, type: s.type, onSelect: () => setSelectedNode(String(s.id || `temp-${i}`)) },
    }));

    const initialEdges: Edge[] = steps.flatMap((s) => {
        if (!s.transitionTargets) return [];
        return s.transitionTargets.split(',').filter(Boolean).map((target) => ({
            id: `e-${s.id}-${target}`,
            source: String(s.id),
            target,
            animated: true,
            style: { stroke: 'var(--accent)' },
        }));
    });

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useMemo(() => {
        if (steps.length > 0) {
            const newNodes = steps.map((s, i) => ({
                id: String(s.id || `temp-${i}`),
                type: 'custom' as const,
                position: { x: s.positionX ?? 250, y: s.positionY ?? i * 120 },
                data: { label: s.name, type: s.type, onSelect: () => setSelectedNode(String(s.id || `temp-${i}`)) },
            }));
            setNodes(newNodes);
        }
    }, [steps, setNodes]);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)' } }, eds));
    }, [setEdges]);

    const addStep = (type: StepType) => {
        const newStep: WorkflowStep = {
            name: `${type} Step`,
            type,
            stepOrder: steps.length,
            positionX: 250,
            positionY: steps.length * 120,
            formFields: [],
            businessRules: [],
        };
        setSteps([...steps, newStep]);
    };

    const selectedStep = useMemo(() => {
        if (!selectedNode) return null;
        return steps.find((s, i) => String(s.id || `temp-${i}`) === selectedNode) || null;
    }, [selectedNode, steps]);

    const updateStep = (field: string, value: unknown) => {
        setSteps(prev => prev.map((s, i) => {
            if (String(s.id || `temp-${i}`) === selectedNode) {
                return { ...s, [field]: value };
            }
            return s;
        }));
    };

    const addFormField = () => {
        if (!selectedNode) return;
        const newField: FormField = {
            label: 'New Field',
            fieldKey: `field_${Date.now()}`,
            fieldType: 'TEXT',
            required: false,
            fieldOrder: selectedStep?.formFields.length || 0,
        };
        updateStep('formFields', [...(selectedStep?.formFields || []), newField]);
    };

    const updateFormField = (index: number, field: string, value: unknown) => {
        const fields = [...(selectedStep?.formFields || [])];
        fields[index] = { ...fields[index], [field]: value };
        updateStep('formFields', fields);
    };

    const removeFormField = (index: number) => {
        const fields = (selectedStep?.formFields || []).filter((_: FormField, i: number) => i !== index);
        updateStep('formFields', fields);
    };

    const stepRules = selectedStep?.businessRules ?? [];

    const addBusinessRule = () => {
        if (!selectedNode) return;
        setSteps(prev => prev.map((s, i) => {
            if (String(s.id || `temp-${i}`) !== selectedNode) return s;
            const rules = s.businessRules ?? [];
            return { ...s, businessRules: [...rules, { name: 'New Rule', conditionExpression: '', actionType: 'REQUIRE_APPROVAL', ruleOrder: rules.length }] };
        }));
    };

    const updateBusinessRule = (index: number, field: keyof BusinessRule, value: string | number | undefined) => {
        if (!selectedNode) return;
        setSteps(prev => prev.map((s, i) => {
            if (String(s.id || `temp-${i}`) !== selectedNode) return s;
            const rules = [...(s.businessRules ?? [])];
            rules[index] = { ...rules[index], [field]: value };
            return { ...s, businessRules: rules };
        }));
    };

    const removeBusinessRule = (index: number) => {
        if (!selectedNode) return;
        setSteps(prev => prev.map((s, i) => {
            if (String(s.id || `temp-${i}`) !== selectedNode) return s;
            const rules = (s.businessRules ?? []).filter((_, idx) => idx !== index);
            return { ...s, businessRules: rules };
        }));
    };

    const addSampleRestriction = (sample: (typeof sampleRestrictions)[0]) => {
        const stepIndex = selectedNode ? steps.findIndex((s, i) => String(s.id || `temp-${i}`) === selectedNode) : 0;
        if (stepIndex < 0) return;
        setSteps(prev => prev.map((s, i) => {
            if (i !== stepIndex) return s;
            const rules = s.businessRules ?? [];
            return { ...s, businessRules: [...rules, { name: sample.name, description: sample.description, conditionExpression: sample.conditionExpression, actionType: sample.actionType, ruleOrder: rules.length }] };
        }));
    };

    const addSampleRule = (sample: (typeof sampleRules)[0]) => {
        const stepIndex = selectedNode ? steps.findIndex((s, i) => String(s.id || `temp-${i}`) === selectedNode) : 0;
        if (stepIndex < 0) return;
        setSteps(prev => prev.map((s, i) => {
            if (i !== stepIndex) return s;
            const rules = s.businessRules ?? [];
            return { ...s, businessRules: [...rules, { name: sample.name, description: sample.description, conditionExpression: sample.conditionExpression, actionType: sample.actionType, ruleOrder: rules.length }] };
        }));
    };

    const addSampleAttribute = (sample: (typeof sampleAttributes)[0]) => {
        const stepIndex = selectedNode
            ? steps.findIndex((s, i) => String(s.id || `temp-${i}`) === selectedNode)
            : 0;
        const targetStepIdx = stepIndex >= 0 ? stepIndex : 0;
        if (steps.length === 0) return;
        const step = steps[targetStepIdx];
        const order = step.formFields?.length ?? 0;
        const newField: FormField = {
            ...sample,
            fieldOrder: order,
        };
        setSteps((prev) =>
            prev.map((s, i) =>
                i === targetStepIdx
                    ? { ...s, formFields: [...(s.formFields || []), newField] }
                    : s
            )
        );
        if (!selectedNode && steps.length > 0) setSelectedNode(String(steps[0].id ?? 'temp-0'));
        setShowFormEditor(true);
    };

    const handleSave = async () => {
        setSaveError(null);
        const name = workflowName?.trim();
        if (!name) {
            setSaveError('Workflow name is required.');
            return;
        }
        if (steps.length === 0) {
            setSaveError('Add at least one step before saving. You can add steps using the toolbar above.');
            return;
        }

        const updatedSteps = steps.map((s, i) => {
            const node = nodes.find(n => n.id === String(s.id || `temp-${i}`));
            const outEdges = edges.filter(e => e.source === String(s.id || `temp-${i}`));
            const rulesWithOrder = (s.businessRules ?? []).map((r, ri) => ({ ...r, ruleOrder: ri }));
            return {
                ...s,
                positionX: node?.position.x ?? s.positionX,
                positionY: node?.position.y ?? s.positionY,
                transitionTargets: outEdges.map(e => e.target).join(','),
                stepOrder: i,
                businessRules: rulesWithOrder,
            };
        });

        const body = { name, description: workflowDesc?.trim() || undefined, steps: updatedSteps };
        try {
            if (isNew) {
                const created = await createWorkflow(body).unwrap();
                navigate(`/admin/workflows/${created.id}`);
            } else {
                await updateWorkflow({ id: Number(id), body }).unwrap();
            }
        } catch (e: unknown) {
            const message = e && typeof e === 'object' && 'data' in e && e.data && typeof e.data === 'object' && 'message' in e.data
                ? String((e.data as { message: string }).message)
                : 'Save failed. Please try again.';
            setSaveError(message);
        }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isNew ? 'Create Workflow' : 'Edit Workflow'}</h1>
                    <p className="page-subtitle">Design your workflow by adding steps and connecting them</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/workflows')}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Workflow</button>
                </div>
            </div>

            {/* Add-step toolbar at top so it's always visible and clickable */}
            <div className="workflow-add-steps-bar">
                <span className="workflow-add-steps-label">Add step to workflow:</span>
                <div className="toolbar workflow-toolbar" role="toolbar" aria-label="Add step">
                    {(['START', 'TASK', 'APPROVAL', 'NOTIFICATION', 'CONDITION', 'END'] as StepType[]).map(type => (
                        <button key={type} type="button" className="toolbar-btn" onClick={() => addStep(type)}>{type}</button>
                    ))}
                </div>
            </div>

            {saveError && (
                <div className="form-error" style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #b91c1c)' }}>
                    {saveError}
                </div>
            )}

            <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Workflow Name *</label>
                    <input className="form-input" value={workflowName} onChange={e => { setWorkflowName(e.target.value); setSaveError(null); }} placeholder="e.g. Employee Onboarding" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <input className="form-input" value={workflowDesc} onChange={e => setWorkflowDesc(e.target.value)} placeholder="Brief description..." />
                </div>
            </div>

            {/* System samples: restrictions, rules, attributes */}
            <div style={{ marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                <button
                    type="button"
                    onClick={() => setShowSamplesPanel((v) => !v)}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-glass)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    <span>Add from system samples (restrictions, rules, attributes)</span>
                    <span style={{ opacity: 0.7 }}>{showSamplesPanel ? '▼' : '▶'}</span>
                </button>
                {showSamplesPanel && (
                    <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--accent)' }}>Sample restrictions</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Add as rules to the selected step.</p>
                                {!selectedNode && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Select a step first.</p>}
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {sampleRestrictions.map((r, i) => (
                                        <li key={i} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{r.conditionExpression} → {r.actionType}</div>
                                            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => addSampleRestriction(r)} disabled={!selectedNode}>Add to step</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--accent)' }}>Sample rules</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Add to the selected step.</p>
                                {!selectedNode && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Select a step first.</p>}
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {sampleRules.map((r, i) => (
                                        <li key={i} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{r.conditionExpression} → {r.actionType}</div>
                                            <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => addSampleRule(r)} disabled={!selectedNode}>Add to step</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--accent)' }}>Sample attributes</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Add to selected step (or first step).</p>
                                {steps.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add a step first, then add attributes.</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {sampleAttributes.map((a, i) => (
                                            <li key={i} style={{ padding: 10, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{a.fieldType}{a.required ? ' · Required' : ''}</div>
                                                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => addSampleAttribute(a)}>Add to step</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', position: 'relative' }}>
                <div className="designer-container" style={{ flex: 1 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        style={{ background: 'var(--bg-primary)' }}
                    >
                        <Background color="var(--border)" gap={20} />
                        <Controls style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                        <MiniMap style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
                    </ReactFlow>
                </div>

                {selectedStep && (
                    <div className="designer-sidebar slide-in">
                        <div className="designer-panel-title">Step Properties</div>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-input" value={selectedStep.name} onChange={e => updateStep('name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={selectedStep.description || ''} onChange={e => updateStep('description', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" value={selectedStep.type} onChange={e => updateStep('type', e.target.value)}>
                                {['START', 'TASK', 'APPROVAL', 'NOTIFICATION', 'CONDITION', 'END'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Assigned Role</label>
                            {rolesError && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', margin: '0 0 4px 0' }}>
                                    Failed to load roles. Check console for details.
                                </p>
                            )}
                            <select
                                className="form-select"
                                value={selectedStep.assignedRoleId ?? ''}
                                onChange={e => updateStep('assignedRoleId', e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">None</option>
                                {rolesLoading ? (
                                    <option value="" disabled>Loading roles…</option>
                                ) : (
                                    (roleList ?? []).map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name === 'USER' ? 'User' : r.name === 'ADMIN' ? 'Admin' : r.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span className="form-label" style={{ margin: 0 }}>Attributes that must be seen (form fields)</span>
                                <button className="btn btn-sm btn-primary" onClick={addFormField}>+ Add</button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>Fields shown to users when they complete this step.</p>
                            {!showFormEditor ? (
                                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setShowFormEditor(true)}>
                                    Edit attributes ({selectedStep.formFields.length})
                                </button>
                            ) : (
                                <div>
                                    {selectedStep.formFields.map((f: FormField, idx: number) => (
                                        <div key={idx} style={{ padding: 12, background: 'var(--bg-glass)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <input className="form-input" value={f.label} onChange={e => updateFormField(idx, 'label', e.target.value)} placeholder="Label" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <input className="form-input" value={f.fieldKey} onChange={e => updateFormField(idx, 'fieldKey', e.target.value)} placeholder="Key" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <select className="form-select" value={f.fieldType} onChange={e => updateFormField(idx, 'fieldType', e.target.value as FieldType)}>
                                                    {['TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'DATE', 'SELECT', 'RADIO', 'CHECKBOX', 'FILE'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="form-checkbox-group">
                                                    <input type="checkbox" className="form-checkbox" checked={f.required} onChange={e => updateFormField(idx, 'required', e.target.checked)} />
                                                    <span style={{ fontSize: '0.8rem' }}>Required</span>
                                                </label>
                                                <button className="btn btn-danger btn-sm" onClick={() => removeFormField(idx)}>Remove</button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowFormEditor(false)}>
                                        Collapse
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span className="form-label" style={{ margin: 0 }}>Rules for this step</span>
                                <button type="button" className="btn btn-sm btn-primary" onClick={addBusinessRule}>+ Add Rule</button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>Evaluated when the user submits this step (e.g. amount &gt; 1000 → require approval).</p>
                            {stepRules.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No rules. Add a rule to enforce conditions on this step.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {stepRules.map((rule, idx) => (
                                        <div key={idx} style={{ padding: 10, background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            <div className="form-group" style={{ marginBottom: 6 }}>
                                                <input className="form-input" value={rule.name} onChange={e => updateBusinessRule(idx, 'name', e.target.value)} placeholder="Rule name" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 6 }}>
                                                <select className="form-select" value={rule.actionType || ''} onChange={e => updateBusinessRule(idx, 'actionType', e.target.value)}>
                                                    <option value="">—</option>
                                                    <option value="REQUIRE_APPROVAL">Require approval</option>
                                                    <option value="NOTIFY_ADMIN">Notify admin</option>
                                                    <option value="AUTO_APPROVE">Auto approve</option>
                                                    <option value="REJECT">Reject</option>
                                                    <option value="ESCALATE">Escalate</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 6 }}>
                                                <input className="form-input" value={rule.conditionExpression || ''} onChange={e => updateBusinessRule(idx, 'conditionExpression', e.target.value)} placeholder="e.g. amount > 1000" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 6 }}>
                                                <input className="form-input" value={rule.description || ''} onChange={e => updateBusinessRule(idx, 'description', e.target.value)} placeholder="Description (optional)" />
                                            </div>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBusinessRule(idx)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={() => setSelectedNode(null)}>
                            Close Panel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
