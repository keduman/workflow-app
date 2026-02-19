import { useState, useCallback, useMemo } from 'react';
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
import { useGetRolesQuery } from '../store/api/roleApi';
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
    const { data: roleList } = useGetRolesQuery();
    const [updateWorkflow] = useUpdateWorkflowMutation();
    const [createWorkflow] = useCreateWorkflowMutation();

    const [workflowName, setWorkflowName] = useState(workflow?.name || '');
    const [workflowDesc, setWorkflowDesc] = useState(workflow?.description || '');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [showFormEditor, setShowFormEditor] = useState(false);
    const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
    const [businessRules, setBusinessRules] = useState<BusinessRule[]>(workflow?.businessRules || []);

    // Sync when workflow loads
    useMemo(() => {
        if (workflow) {
            setWorkflowName(workflow.name);
            setWorkflowDesc(workflow.description || '');
            setSteps(workflow.steps || []);
            setBusinessRules(workflow.businessRules || []);
        }
    }, [workflow]);

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

    const addBusinessRule = () => {
        setBusinessRules((prev) => [
            ...prev,
            { name: 'New Rule', conditionExpression: '', actionType: 'REQUIRE_APPROVAL', ruleOrder: prev.length },
        ]);
    };

    const updateBusinessRule = (index: number, field: keyof BusinessRule, value: string | number | undefined) => {
        setBusinessRules((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeBusinessRule = (index: number) => {
        setBusinessRules((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const updatedSteps = steps.map((s, i) => {
            const node = nodes.find(n => n.id === String(s.id || `temp-${i}`));
            const outEdges = edges.filter(e => e.source === String(s.id || `temp-${i}`));
            return {
                ...s,
                positionX: node?.position.x ?? s.positionX,
                positionY: node?.position.y ?? s.positionY,
                transitionTargets: outEdges.map(e => e.target).join(','),
                stepOrder: i,
            };
        });

        const rulesWithOrder = businessRules.map((r, i) => ({ ...r, ruleOrder: i }));
        const body = { name: workflowName, description: workflowDesc, steps: updatedSteps, businessRules: rulesWithOrder };
        try {
            if (isNew) {
                const created = await createWorkflow(body).unwrap();
                navigate(`/admin/workflows/${created.id}`);
            } else {
                await updateWorkflow({ id: Number(id), body }).unwrap();
            }
        } catch (e) {
            console.error('Save failed', e);
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

            <div className="grid grid-2" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Workflow Name</label>
                    <input className="form-input" value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="e.g. Employee Onboarding" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <input className="form-input" value={workflowDesc} onChange={e => setWorkflowDesc(e.target.value)} placeholder="Brief description..." />
                </div>
            </div>

            <div style={{ marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="form-label" style={{ margin: 0, fontSize: '1rem' }}>Business Rules</span>
                    <button type="button" className="btn btn-sm btn-primary" onClick={addBusinessRule}>+ Add Rule</button>
                </div>
                <p className="page-subtitle" style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>Define conditions and actions (e.g. amount &gt; 1000 → require approval). Saved with the workflow.</p>
                {businessRules.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>No rules yet. Add a rule to enforce conditions on this workflow.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {businessRules.map((rule, idx) => (
                            <div key={idx} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div className="grid grid-2" style={{ gap: 12, marginBottom: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Rule name</label>
                                        <input className="form-input" value={rule.name} onChange={e => updateBusinessRule(idx, 'name', e.target.value)} placeholder="e.g. High value approval" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Action</label>
                                        <select className="form-select" value={rule.actionType || ''} onChange={e => updateBusinessRule(idx, 'actionType', e.target.value)}>
                                            <option value="">—</option>
                                            <option value="REQUIRE_APPROVAL">Require approval</option>
                                            <option value="NOTIFY_ADMIN">Notify admin</option>
                                            <option value="AUTO_APPROVE">Auto approve</option>
                                            <option value="REJECT">Reject</option>
                                            <option value="ESCALATE">Escalate</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 8 }}>
                                    <label className="form-label">Condition (e.g. amount &gt; 1000, status == &#39;PENDING&#39;)</label>
                                    <input className="form-input" value={rule.conditionExpression || ''} onChange={e => updateBusinessRule(idx, 'conditionExpression', e.target.value)} placeholder="amount > 1000" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 8 }}>
                                    <label className="form-label">Description (optional)</label>
                                    <input className="form-input" value={rule.description || ''} onChange={e => updateBusinessRule(idx, 'description', e.target.value)} placeholder="When this rule applies..." />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBusinessRule(idx)}>Remove rule</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="toolbar">
                {(['START', 'TASK', 'APPROVAL', 'NOTIFICATION', 'CONDITION', 'END'] as StepType[]).map(type => (
                    <button key={type} className="toolbar-btn" onClick={() => addStep(type)}>{type}</button>
                ))}
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
                            <select className="form-select" value={selectedStep.assignedRoleId || ''} onChange={e => updateStep('assignedRoleId', e.target.value ? Number(e.target.value) : null)}>
                                <option value="">None</option>
                                {roleList?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span className="form-label" style={{ margin: 0 }}>Form Fields</span>
                                <button className="btn btn-sm btn-primary" onClick={addFormField}>+ Add</button>
                            </div>
                            {!showFormEditor ? (
                                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setShowFormEditor(true)}>
                                    Edit Form Fields ({selectedStep.formFields.length})
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

                        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={() => setSelectedNode(null)}>
                            Close Panel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
