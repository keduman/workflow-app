import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WorkflowListPage from './pages/WorkflowListPage';
import WorkflowDesigner from './pages/WorkflowDesigner';
import RoleManagerPage from './pages/RoleManagerPage';
import TaskListPage from './pages/TaskListPage';
import TaskExecutionPage from './pages/TaskExecutionPage';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/:id" element={<TaskExecutionPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/workflows" element={<WorkflowListPage />} />
              <Route path="/admin/workflows/:id" element={<WorkflowDesigner />} />
              <Route path="/admin/roles" element={<RoleManagerPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
