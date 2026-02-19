import { useSelector } from 'react-redux';
import { type RootState } from '../store/store';
import { useGetMyTasksQuery } from '../store/api/taskApi';
import { useGetWorkflowsQuery } from '../store/api/workflowApi';
import { useGetRolesQuery } from '../store/api/roleApi';
import { motion } from 'framer-motion';

export default function DashboardPage() {
    const { username, roles } = useSelector((s: RootState) => s.auth);
    const isAdmin = roles.includes('ADMIN');
    const { data: tasks } = useGetMyTasksQuery({ page: 0, size: 5 });
    const { data: workflows } = useGetWorkflowsQuery({ page: 0, size: 100 }, { skip: !isAdmin });
    const { data: roleList } = useGetRolesQuery(undefined, { skip: !isAdmin });

    const inProgress = tasks?.content.filter(t => t.status === 'IN_PROGRESS').length ?? 0;
    const completed = tasks?.content.filter(t => t.status === 'COMPLETED').length ?? 0;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome back, {username} 👋</h1>
                    <p className="page-subtitle">Here's an overview of your workflow activity</p>
                </div>
            </div>

            <div className="grid grid-4" style={{ marginBottom: 32 }}>
                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <div className="stat-value">{tasks?.totalElements ?? 0}</div>
                    <div className="stat-label">Total Tasks</div>
                </motion.div>
                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="stat-value">{inProgress}</div>
                    <div className="stat-label">In Progress</div>
                </motion.div>
                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="stat-value">{completed}</div>
                    <div className="stat-label">Completed</div>
                </motion.div>
                {isAdmin && (
                    <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="stat-value">{workflows?.totalElements ?? 0}</div>
                        <div className="stat-label">Workflows</div>
                    </motion.div>
                )}
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Tasks</h3>
                    </div>
                    {tasks?.content.length ? (
                        <table>
                            <thead>
                                <tr><th>Workflow</th><th>Step</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {tasks.content.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.workflowName}</td>
                                        <td>{t.currentStepName || '—'}</td>
                                        <td><span className={`badge badge-${t.status.toLowerCase().replace('_', '-')}`}>{t.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <div className="empty-state"><p>No tasks yet</p></div>}
                </div>

                {isAdmin && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Roles Overview</h3>
                        </div>
                        {roleList?.length ? (
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Description</th><th>Permissions</th></tr>
                                </thead>
                                <tbody>
                                    {roleList.map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{r.description}</td>
                                            <td>{r.permissions?.length ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="empty-state"><p>No roles defined</p></div>}
                    </div>
                )}
            </div>
        </div>
    );
}
