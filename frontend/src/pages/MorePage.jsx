import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    UserCheck, ListTodo, FileText, CreditCard, BarChart3, Settings,
    LogOut, History, ChevronRight, Moon, Sun, Activity
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const moreItems = [
    { to: '/clients', icon: UserCheck, label: 'Clients', desc: 'Manage client profiles', color: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24', module: 'clients' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks', desc: 'View & manage tasks', color: 'rgba(6,182,212,0.15)', iconColor: '#22d3ee', module: 'tasks' },
    { to: '/invoices', icon: FileText, label: 'Invoices', desc: 'Invoice management', color: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa', module: 'invoices' },
    { to: '/payments', icon: CreditCard, label: 'Payments', desc: 'Payment tracking', color: 'rgba(16,185,129,0.15)', iconColor: '#34d399', module: 'payments' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Reports & insights', color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa', module: 'reports' },
    { to: '/activity', icon: Activity, label: 'Activity Feed', desc: 'Recent system events', color: 'rgba(236,72,153,0.15)', iconColor: '#ec4899', module: 'admin' },
    { to: '/admin', icon: Settings, label: 'Settings', desc: 'System configuration', color: 'rgba(239,68,68,0.15)', iconColor: '#f87171', module: 'admin' },
];

export default function MorePage() {
    const { user, logout, hasPermission } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const visibleItems = moreItems.filter(item => hasPermission(item.module));

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div>
                    <div className="mobile-header-title">More</div>
                </div>
            </div>

            <div className="page-body">
                {/* User Profile Card */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 18, color: 'white'
                    }}>
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>{user?.first_name} {user?.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                            {user?.role?.replace('_', ' ')}
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}
                <div className="card-list">
                    {visibleItems.map((item) => (
                        <NavLink key={item.to} to={item.to} className="settings-item" style={{ textDecoration: 'none' }}>
                            <div className="settings-item-icon" style={{ background: item.color }}>
                                <item.icon size={22} color={item.iconColor} />
                            </div>
                            <div className="settings-item-info">
                                <div className="settings-item-title">{item.label}</div>
                                <div className="settings-item-desc">{item.desc}</div>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </NavLink>
                    ))}

                    <div className="settings-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
                        <div className="settings-item-icon" style={{ background: 'rgba(100, 116, 139, 0.15)' }}>
                            {theme === 'dark' ? <Moon size={22} color="#94a3b8" /> : <Sun size={22} color="#94a3b8" />}
                        </div>
                        <div className="settings-item-info">
                            <div className="settings-item-title">Appearance</div>
                            <div className="settings-item-desc">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'} (Tap to toggle)</div>
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className="btn btn-secondary btn-block"
                    style={{ marginTop: 32, gap: 8 }}
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
