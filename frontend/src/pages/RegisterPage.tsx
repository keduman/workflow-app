import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation } from '../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' });
    const [error, setError] = useState('');
    const [register, { isLoading }] = useRegisterMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const data = await register(form).unwrap();
            dispatch(setCredentials(data));
            navigate('/dashboard');
        } catch (err: unknown) {
            const msg = (err as { data?: { message?: string } })?.data?.message || 'Registration failed';
            setError(msg);
        }
    };

    const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    return (
        <div className="auth-container">
            <motion.div className="auth-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="auth-logo">WorkflowPro</div>
                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Get started with your workflow automation</p>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={form.fullName} onChange={update('fullName')} placeholder="John Doe" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" value={form.username} onChange={update('username')} placeholder="johndoe" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={update('email')} placeholder="john@example.com" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" value={form.password} onChange={update('password')} placeholder="Min 6 characters" required minLength={6} />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>
                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </motion.div>
        </div>
    );
}
