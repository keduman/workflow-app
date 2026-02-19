import { useNavigate } from 'react-router-dom';
import { useGetWorkflowsQuery, useDeleteWorkflowMutation, usePublishWorkflowMutation } from '../store/api/workflowApi';
import { motion } from 'framer-motion';

export default function WorkflowListPage() {
    const navigate = useNavigate();
    const { data, isLoading } = useGetWorkflowsQuery({ page: 0, size: 50 });
    const [deleteWorkflow] = useDeleteWorkflowMutation();
    const [publishWorkflow] = usePublishWorkflowMutation();

    if (isLoading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workflows</h1>
                    <p className="page-subtitle">Design and manage your workflow processes</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/admin/workflows/new')}>
                    + Create Workflow
                </button>
            </div>

            {data?.content.length ? (
                <div className="grid grid-3">
                    {data.content.map((wf, idx) => (
                        <motion.div
                            key={wf.id}
                            className="card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/workflows/${wf.id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{wf.name}</h3>
                                <span className={`badge badge-${wf.status.toLowerCase()}`}>{wf.status}</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 16 }}>{wf.description || 'No description'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span>{wf.stepCount ?? wf.steps?.length ?? 0} steps</span>
                                <span>by {wf.createdByUsername}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                {wf.status === 'DRAFT' && (
                                    <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); publishWorkflow(wf.id!); }}>
                                        Publish
                                    </button>
                                )}
                                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id!); }}>
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <h3>No workflows yet</h3>
                        <p>Create your first workflow to get started with process automation</p>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/workflows/new')}>Create Workflow</button>
                    </div>
                </div>
            )}
        </div>
    );
}
