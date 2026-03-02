import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, UserCheck, FolderKanban, ListTodo,
    FileText, CreditCard, BarChart3, Settings, LogOut, Menu, X, Zap,
    Plus, MoreHorizontal, Home, Search, Moon, Sun, Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import GlobalSearch from './GlobalSearch';
import { useTheme } from '../context/ThemeContext';

// Desktop sidebar nav items
const sidebarNavItems = [
    {
        section: 'Overview', items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard', module: 'reports' },
        ]
    },
    {
        section: 'Sales', items: [
            { to: '/leads', icon: Users, label: 'Leads', module: 'leads' },
            { to: '/clients', icon: UserCheck, label: 'Clients', module: 'clients' },
        ]
    },
    {
        section: 'Delivery', items: [
            { to: '/projects', icon: FolderKanban, label: 'Projects', module: 'projects' },
            { to: '/tasks', icon: ListTodo, label: 'Tasks', module: 'tasks' },
        ]
    },
    {
        section: 'Finance', items: [
            { to: '/invoices', icon: FileText, label: 'Invoices', module: 'invoices' },
            { to: '/payments', icon: CreditCard, label: 'Payments', module: 'payments' },
        ]
    },
    {
        section: 'Analytics', items: [
            { to: '/analytics', icon: BarChart3, label: 'Reports', module: 'reports' },
        ]
    },
    {
        section: 'System', items: [
            { to: '/activity', icon: Activity, label: 'Activity Feed', module: 'admin' },
            { to: '/admin', icon: Settings, label: 'Admin Panel', module: 'admin' },
        ]
    },
];

// Quick create options
const quickCreateItems = [
    { label: 'New Lead', icon: Users, to: '/leads', color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' },
    { label: 'New Project', icon: FolderKanban, to: '/projects', color: 'rgba(16,185,129,0.15)', iconColor: '#34d399' },
    { label: 'New Invoice', icon: FileText, to: '/invoices', color: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa' },
    { label: 'New Client', icon: UserCheck, to: '/clients', color: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24' },
];

export default function Layout() {
    const { user, logout, hasPermission } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const isMoreActive = ['/clients', '/tasks', '/invoices', '/payments', '/analytics', '/admin'].some(p => location.pathname.startsWith(p));

    return (
        <div>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={20} color="white" />
                    </div>
                    <h1>GWF CRM</h1>
                </div>

                <nav className="sidebar-nav">
                    {sidebarNavItems.map((section) => {
                        const visibleItems = section.items.filter(item => hasPermission(item.module));
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={section.section}>
                                <div className="sidebar-section-title">{section.section}</div>
                                {visibleItems.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.to === '/'}
                                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    >
                                        <item.icon size={18} />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', marginBottom: 8 }}>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)',
                                borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px'
                            }}
                        >
                            <Search size={16} />
                            Search... <span style={{ marginLeft: 'auto', fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>⌘K</span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--color-primary-light)' }}>
                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.first_name} {user?.last_name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {user?.role?.replace('_', ' ')}
                            </div>
                        </div>
                        <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} title="Toggle Theme">
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="app-content">
                <Outlet />
            </main>

            {/* Bottom Navigation (mobile) */}
            <nav className="bottom-nav">
                <NavLink to="/" end className={`bottom-nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
                    <Home size={22} />
                    <span>Home</span>
                </NavLink>

                <NavLink to="/projects" className={`bottom-nav-item ${isActive('/projects') ? 'active' : ''}`}>
                    <FolderKanban size={22} />
                    <span>Projects</span>
                </NavLink>

                <button
                    className="bottom-nav-fab"
                    onClick={() => setQuickCreateOpen(true)}
                    aria-label="Quick Create"
                >
                    <Plus size={26} />
                </button>

                <NavLink to="/leads" className={`bottom-nav-item ${isActive('/leads') ? 'active' : ''}`}>
                    <Users size={22} />
                    <span>Leads</span>
                </NavLink>

                <NavLink to="/more" className={`bottom-nav-item ${isMoreActive ? 'active' : ''}`}>
                    <MoreHorizontal size={22} />
                    <span>More</span>
                </NavLink>
            </nav>

            {/* Quick Create Modal */}
            {quickCreateOpen && (
                <div className="quick-create-overlay" onClick={() => setQuickCreateOpen(false)}>
                    <div className="quick-create-menu" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Quick Create</div>
                        {quickCreateItems.map((item) => (
                            <div
                                key={item.label}
                                className="quick-create-item"
                                onClick={() => {
                                    setQuickCreateOpen(false);
                                    navigate(item.to, { state: { openCreate: true } });
                                }}
                            >
                                <div className="quick-create-icon" style={{ background: item.color }}>
                                    <item.icon size={22} color={item.iconColor} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Global Search Modal */}
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
}
