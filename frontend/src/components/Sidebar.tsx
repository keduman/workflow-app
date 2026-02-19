import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';

export default function Sidebar() {
    const { username, roles } = useSelector((s: RootState) => s.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAdmin = roles.includes('ADMIN');

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>WorkflowPro</h1>
                <span>Process Automation</span>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">Main</div>
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                        <span>My Tasks</span>
                    </NavLink>
                </div>

                {isAdmin && (
                    <div className="nav-section">
                        <div className="nav-section-title">Admin</div>
                        <NavLink to="/admin/workflows" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4m-7.07-2.93l2.83-2.83m8.49-8.49l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83" /></svg>
                            <span>Workflows</span>
                        </NavLink>
                        <NavLink to="/admin/roles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15c-3.87 0-7 1.57-7 3.5V21h14v-2.5c0-1.93-3.13-3.5-7-3.5z" /><circle cx="12" cy="7" r="4" /></svg>
                            <span>Roles</span>
                        </NavLink>
                    </div>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">{username?.[0]?.toUpperCase()}</div>
                    <div>
                        <div className="user-name">{username}</div>
                        <div className="user-role">{roles.join(', ')}</div>
                    </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
