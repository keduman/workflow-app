import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from '../store/store';
import Sidebar from './Sidebar';

export function ProtectedRoute() {
    const { isAuthenticated, authCheckComplete } = useSelector((s: RootState) => s.auth);
    if (!authCheckComplete) return <div className="loading-container"><div className="spinner" /></div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content fade-in">
                <Outlet />
            </main>
        </div>
    );
}

export function AdminRoute() {
    const { roles } = useSelector((s: RootState) => s.auth);
    if (!roles.includes('ADMIN')) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}

export function PublicRoute() {
    const { isAuthenticated, authCheckComplete } = useSelector((s: RootState) => s.auth);
    if (!authCheckComplete) return <div className="loading-container"><div className="spinner" /></div>;
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}
