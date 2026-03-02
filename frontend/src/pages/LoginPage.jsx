import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LayoutGrid, Mail, Lock, Users } from 'lucide-react';

const DEMO_USERS = [
    { role: 'Admin', email: 'admin@gwfcrm.com', password: 'admin123', color: '#ef4444' },
    { role: 'Sales', email: 'sales@gwfcrm.com', password: 'password123', color: '#8b5cf6' },
    { role: 'PM', email: 'pm@gwfcrm.com', password: 'password123', color: '#3b82f6' },
    { role: 'Developer', email: 'dev@gwfcrm.com', password: 'password123', color: '#10b981' },
    { role: 'Billing', email: 'billing@gwfcrm.com', password: 'password123', color: '#f59e0b' },
];

export default function LoginPage() {
    const { login } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            showToast('Welcome back!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Login failed', 'error');
        }
        setLoading(false);
    };

    const fillCredentials = (user) => {
        setEmail(user.email);
        setPassword(user.password);
    };

    return (
        <div className="login-page">
            <div className="login-logo">
                <LayoutGrid size={32} color="#60a5fa" />
            </div>
            <h1 className="login-title">GWF CRM</h1>
            <p className="login-subtitle">Welcome back to your agency dashboard.</p>

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="name@getwebfast.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ paddingRight: 44 }}
                        />
                        <Mail size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ paddingRight: 44 }}
                        />
                        <Lock size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-block btn-lg"
                    type="submit"
                    disabled={loading}
                    style={{ marginTop: 12 }}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            {/* Demo Credentials */}
            <div style={{ marginTop: 28, width: '100%', maxWidth: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Users size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Demo Accounts</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DEMO_USERS.map(u => (
                        <button
                            key={u.email}
                            type="button"
                            onClick={() => fillCredentials(u)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 14px', borderRadius: 12,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                cursor: 'pointer', transition: 'all 0.2s',
                                textAlign: 'left', width: '100%',
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = u.color; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                        >
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${u.color}20`, color: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                                {u.role[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.role}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email} / {u.password}</div>
                            </div>
                            <span style={{ fontSize: 11, color: u.color, fontWeight: 600, flexShrink: 0 }}>Use →</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
