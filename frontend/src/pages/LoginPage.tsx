import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [login, { isLoading }] = useLoginMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login({ username, password }).unwrap();
            dispatch(setCredentials(data));
            navigate('/dashboard');
        } catch {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="auth-container">
            <motion.div className="auth-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="auth-logo">WorkflowPro</div>
                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to your account to continue</p>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </motion.div>
        </div>
    );
}
