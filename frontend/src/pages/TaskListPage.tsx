import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMyTasksQuery, useGetPublishedWorkflowsQuery, useStartWorkflowMutation, useCancelTaskMutation } from '../store/api/taskApi';
import { motion } from 'framer-motion';

export default function TaskListPage() {
    const navigate = useNavigate();
    const { data: tasks, isLoading } = useGetMyTasksQuery({ page: 0, size: 50 });
    const { data: workflows } = useGetPublishedWorkflowsQuery({ page: 0, size: 50 });
    const [startWorkflow] = useStartWorkflowMutation();
    const [cancelTask] = useCancelTaskMutation();
    const [showStart, setShowStart] = useState(false);

    const handleStart = async (workflowId: number) => {
        const instance = await startWorkflow(workflowId).unwrap();
        setShowStart(false);
        navigate(`/tasks/${instance.id}`);
    };

    if (isLoading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Tasks</h1>
                    <p className="page-subtitle">View and manage your assigned workflow tasks</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowStart(true)}>+ Start Workflow</button>
            </div>

            {showStart && (
                <div className="modal-overlay" onClick={() => setShowStart(false)}>
                    <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Start a Workflow</h3>
                        {workflows?.content.length ? (
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {workflows.content.map(wf => (
                                    <div key={wf.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{wf.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{wf.description || 'No description'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{wf.steps?.length || 0} steps</div>
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleStart(wf.id!)}>Start</button>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="empty-state"><p>No published workflows available</p></div>}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowStart(false)}>Close</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {tasks?.content.length ? (
                <div className="card">
                    <table>
                        <thead>
                            <tr><th>Workflow</th><th>Current Step</th><th>Status</th><th>Started</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {tasks.content.map((task, idx) => (
                                <motion.tr key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}>
                                    <td style={{ fontWeight: 600 }}>{task.workflowName}</td>
                                    <td>{task.currentStepName || '—'}</td>
                                    <td><span className={`badge badge-${task.status.toLowerCase().replace('_', '-')}`}>{task.status}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {task.status === 'IN_PROGRESS' && (
                                                <>
                                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks/${task.id}`)}>Continue</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => cancelTask(task.id)}>Cancel</button>
                                                </>
                                            )}
                                            {task.status !== 'IN_PROGRESS' && (
                                                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/tasks/${task.id}`)}>View</button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <h3>No tasks yet</h3>
                        <p>Start a workflow to begin your first task</p>
                        <button className="btn btn-primary" onClick={() => setShowStart(true)}>Start Workflow</button>
                    </div>
                </div>
            )}
        </div>
    );
}
