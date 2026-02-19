import { useState } from 'react';
import { useGetRolesQuery, useCreateRoleMutation, useDeleteRoleMutation, useGetUsersQuery, useAssignRoleMutation, useRemoveRoleMutation } from '../store/api/roleApi';
import { motion } from 'framer-motion';

export default function RoleManagerPage() {
    const { data: roles, isLoading } = useGetRolesQuery();
    const { data: usersPage } = useGetUsersQuery({ page: 0, size: 100 });
    const [createRole] = useCreateRoleMutation();
    const [deleteRole] = useDeleteRoleMutation();
    const [assignRole] = useAssignRoleMutation();
    const [removeRole] = useRemoveRoleMutation();

    const [showCreate, setShowCreate] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: '' });
    const [showAssign, setShowAssign] = useState<number | null>(null);

    const handleCreate = async () => {
        await createRole({ name: newRole.name, description: newRole.description, permissions: newRole.permissions.split(',').map(s => s.trim()).filter(Boolean) });
        setNewRole({ name: '', description: '', permissions: '' });
        setShowCreate(false);
    };

    if (isLoading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Role Management</h1>
                    <p className="page-subtitle">Create roles and assign them to users</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Role</button>
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Create New Role</h3>
                        <div className="form-group">
                            <label className="form-label">Role Name</label>
                            <input className="form-input" value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} placeholder="MANAGER" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input className="form-input" value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} placeholder="Department manager" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Permissions (comma-separated)</label>
                            <input className="form-input" value={newRole.permissions} onChange={e => setNewRole(r => ({ ...r, permissions: e.target.value }))} placeholder="READ, WRITE, APPROVE" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Roles</h3>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Description</th><th>Permissions</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {roles?.map(role => (
                                <tr key={role.id}>
                                    <td style={{ fontWeight: 600 }}>{role.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{role.description}</td>
                                    <td>{role.permissions?.join(', ')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setShowAssign(role.id)}>Assign</button>
                                            <button className="btn btn-sm btn-danger" onClick={() => deleteRole(role.id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Users</h3>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Username</th><th>Email</th><th>Roles</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {usersPage?.content.map(user => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 600 }}>{user.username}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                                    <td>{user.roles?.join(', ')}</td>
                                    <td>
                                        {user.roles?.map(roleName => {
                                            const roleObj = roles?.find(r => r.name === roleName);
                                            return roleObj ? (
                                                <button key={roleName} className="btn btn-sm btn-danger" style={{ marginRight: 4 }} onClick={() => removeRole({ roleId: roleObj.id, userId: user.id })}>
                                                    ✕ {roleName}
                                                </button>
                                            ) : null;
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAssign !== null && (
                <div className="modal-overlay" onClick={() => setShowAssign(null)}>
                    <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Assign Role: {roles?.find(r => r.id === showAssign)?.name}</h3>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                            {usersPage?.content.map(user => (
                                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                    </div>
                                    <button className="btn btn-sm btn-primary" onClick={() => assignRole({ roleId: showAssign!, userId: user.id })}>
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Close</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
