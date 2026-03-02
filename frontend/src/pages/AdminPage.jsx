import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    Settings, Users, FileText, Building, DollarSign, History, Download,
    ChevronRight, Plus, Trash2, Edit, Search, ArrowLeft, Shield, Globe, RotateCcw, AlertTriangle
} from 'lucide-react';

const ROLES = [
    { key: 'ADMIN', label: 'Admin', desc: 'Full System Access', color: '#ef4444', icon: '🛡️' },
    { key: 'SALES', label: 'Sales', desc: 'Leads & Sales Access', color: '#3b82f6', icon: '💼' },
    { key: 'PROJECT_MANAGER', label: 'PM', desc: 'Projects & Tasks', color: '#10b981', icon: '📋' },
    { key: 'DEVELOPER', label: 'Dev', desc: 'Tasks Only', color: '#8b5cf6', icon: '💻' },
    { key: 'BILLING', label: 'Billing', desc: 'Finance Access', color: '#f59e0b', icon: '💰' },
];

const PERM_MAP = {
    ADMIN: { leads: 'RWD', clients: 'RWD', projects: 'RWD', tasks: 'RWD', invoices: 'RWD', payments: 'RWD', reports: 'R', admin: 'RWD' },
    SALES: { leads: 'RWD', clients: 'RW', projects: 'R', tasks: '', invoices: 'R', payments: '', reports: 'R', admin: '' },
    PROJECT_MANAGER: { leads: 'R', clients: 'R', projects: 'RWD', tasks: 'RWD', invoices: 'R', payments: '', reports: 'R', admin: '' },
    DEVELOPER: { leads: '', clients: '', projects: 'R', tasks: 'RW', invoices: '', payments: '', reports: '', admin: '' },
    BILLING: { leads: '', clients: 'R', projects: 'R', tasks: '', invoices: 'RWD', payments: 'RWD', reports: 'R', admin: '' },
};

const PERM_SECTIONS = ['Leads & Sales', 'Projects', 'Financials'];
const PERM_MAP_DISPLAY = {
    ADMIN: ['RWD', 'RWD', 'RWD'],
    SALES: ['RWD', 'R', 'R'],
    PROJECT_MANAGER: ['R', 'RWD', 'R'],
    DEVELOPER: ['', 'RW', ''],
    BILLING: ['R', 'R', 'RWD'],
};

const EXPORT_TABLES = [
    { key: 'users', icon: Users, label: 'Users', color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' },
    { key: 'leads', icon: Users, label: 'Leads', color: 'rgba(139,92,246,0.15)', iconColor: '#a78bfa' },
    { key: 'clients', icon: Building, label: 'Clients', color: 'rgba(16,185,129,0.15)', iconColor: '#34d399' },
    { key: 'projects', icon: FileText, label: 'Projects', color: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24' },
    { key: 'tasks', icon: FileText, label: 'Tasks', color: 'rgba(6,182,212,0.15)', iconColor: '#22d3ee' },
    { key: 'invoices', icon: FileText, label: 'Invoices', color: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' },
    { key: 'payments', icon: DollarSign, label: 'Payments', color: 'rgba(16,185,129,0.15)', iconColor: '#34d399' },
];

export default function AdminPage() {
    const { showToast } = useToast();
    const [view, setView] = useState('settings'); // 'settings', 'users', 'plans', 'coupons', 'taxes', 'currencies', 'export', 'deleted-clients'
    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(null);
    const [form, setForm] = useState({});
    const [deletedClients, setDeletedClients] = useState([]);

    const fetchForView = async (v) => {
        setLoading(true);
        try {
            if (v === 'users') { const { data } = await api.get('/admin/users'); setUsers(data); }
            else if (v === 'plans') { const { data } = await api.get('/admin/plans'); setPlans(data); }
            else if (v === 'coupons') { const { data } = await api.get('/admin/coupons'); setCoupons(data); }
            else if (v === 'taxes') { const { data } = await api.get('/admin/taxes'); setTaxes(data); }
            else if (v === 'currencies') { const { data } = await api.get('/admin/currencies'); setCurrencies(data); }
            else if (v === 'deleted-clients') { const { data } = await api.get('/admin/deleted-clients'); setDeletedClients(data); }
        } catch { showToast('Error loading data', 'error'); }
        setLoading(false);
    };

    const goTo = (v) => { setView(v); fetchForView(v); };

    const handleExport = async (table) => {
        try {
            const res = await api.get(`/admin/export/${table}`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${table}.csv`;
            a.click();
            showToast(`${table}.csv downloaded`, 'success');
        } catch { showToast('Export failed', 'error'); }
    };

    const handleDelete = async (type, id) => {
        if (!confirm('Delete this item?')) return;
        try {
            await api.delete(`/admin/${type}/${id}`);
            showToast('Deleted', 'success');
            fetchForView(type === 'plans' ? 'plans' : type);
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/plans', { ...form, price: parseFloat(form.price) || 0 });
            showToast('Plan created', 'success');
            setShowModal(null);
            fetchForView('plans');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/coupons', { ...form, discount_percent: parseFloat(form.discount_percent) || 0 });
            showToast('Coupon created', 'success');
            setShowModal(null);
            fetchForView('coupons');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };

    const handleCreateTax = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/taxes', { ...form, rate: parseFloat(form.rate) || 0, is_default: form.is_default === 'true' });
            showToast('Tax config created', 'success');
            setShowModal(null);
            fetchForView('taxes');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };

    const handleCreateCurrency = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/currencies', { ...form, is_default: form.is_default === 'true' });
            showToast('Currency created', 'success');
            setShowModal(null);
            fetchForView('currencies');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };

    // === SETTINGS VIEW ===
    if (view === 'settings') {
        return (
            <div className="page-enter">
                <div className="mobile-header">
                    <div className="mobile-header-title">System Settings</div>
                    <button className="mobile-header-icon"><Search size={18} /></button>
                </div>

                <div className="page-body">
                    {/* RBAC Matrix */}
                    <div className="section-header">
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)' }}>Role Permissions Matrix</div>
                    </div>
                    <div className="rbac-scroll" style={{ marginBottom: 24 }}>
                        <div className="rbac-cards">
                            {ROLES.map(role => (
                                <div key={role.key} className="rbac-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${role.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                            {role.icon}
                                        </div>
                                        <div>
                                            <div className="rbac-role-name">{role.label}</div>
                                            <div className="rbac-role-desc">{role.desc}</div>
                                        </div>
                                    </div>
                                    {PERM_SECTIONS.map((sec, i) => (
                                        <div key={sec} className="rbac-perm-row">
                                            <span className="rbac-perm-label">{sec}</span>
                                            <div className="rbac-perm-pills">
                                                {['R', 'W', 'D'].map(p => {
                                                    const perms = PERM_MAP_DISPLAY[role.key]?.[i] || '';
                                                    const active = perms.includes(p);
                                                    return (
                                                        <div key={p} className={`rbac-pill ${active ? `active-${p.toLowerCase()}` : 'inactive'}`}>
                                                            {p}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* General Administration */}
                    <div className="settings-section-title">General Administration</div>
                    <div className="settings-item" onClick={() => goTo('users')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(59,130,246,0.15)' }}><Users size={22} color="#60a5fa" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">User Management</div><div className="settings-item-desc">Manage roles & permissions (RBAC)</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>
                    <div className="settings-item" onClick={() => goTo('plans')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><FileText size={22} color="#a78bfa" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Service Plans</div><div className="settings-item-desc">Configure tiers and pricing</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>

                    {/* Financial Configuration */}
                    <div className="settings-section-title">Financial Configuration</div>
                    <div className="settings-item" onClick={() => goTo('taxes')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><DollarSign size={22} color="#34d399" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Tax & Currency</div><div className="settings-item-desc">VAT rates, default currency</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>
                    <div className="settings-item" onClick={() => goTo('coupons')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><FileText size={22} color="#fbbf24" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Discount Coupons</div><div className="settings-item-desc">Manage coupon codes</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>

                    {/* System & Security */}
                    <div className="settings-section-title">System & Data</div>
                    <div className="settings-item" onClick={() => goTo('currencies')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(6,182,212,0.15)' }}><Globe size={22} color="#22d3ee" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Currencies</div><div className="settings-item-desc">Multi-currency support</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>
                    <div className="settings-item" onClick={() => setView('export')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(239,68,68,0.15)' }}><Download size={22} color="#f87171" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Data Export</div><div className="settings-item-desc">Download CSV backups</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>
                    <div className="settings-item" onClick={() => goTo('deleted-clients')}>
                        <div className="settings-item-icon" style={{ background: 'rgba(239,68,68,0.15)' }}><Trash2 size={22} color="#f87171" /></div>
                        <div className="settings-item-info"><div className="settings-item-title">Deleted Clients</div><div className="settings-item-desc">Restore or permanently remove</div></div>
                        <ChevronRight size={18} className="settings-item-arrow" />
                    </div>
                </div>
            </div>
        );
    }

    // === DATA EXPORT VIEW ===
    if (view === 'export') {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => setView('settings')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Data Export Center</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body">
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Export Data</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Download your agency data in CSV format.</p>

                    <div className="hero-card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>Global Export</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Download complete database backup</div>
                        <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => EXPORT_TABLES.forEach(t => handleExport(t.key))}>
                            <Download size={16} /> Export All
                        </button>
                    </div>

                    <div className="section-header"><div className="section-title">Exportable Entities</div></div>
                    {EXPORT_TABLES.map(t => (
                        <div key={t.key} className="export-card">
                            <div className="export-card-icon" style={{ background: t.color }}>
                                <t.icon size={20} color={t.iconColor} />
                            </div>
                            <div className="export-card-info">
                                <div className="export-card-name">{t.label}</div>
                            </div>
                            <button className="export-card-btn" onClick={() => handleExport(t.key)}>
                                <Download size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // === DELETED CLIENTS VIEW ===
    if (view === 'deleted-clients') {
        const handleRestore = async (clientId) => {
            try {
                await api.post(`/admin/deleted-clients/${clientId}/restore`);
                showToast('Client restored!', 'success');
                fetchForView('deleted-clients');
            } catch (err) { showToast(err.response?.data?.error || 'Error restoring', 'error'); }
        };
        const handlePermanentDelete = async (clientId, clientName) => {
            if (!confirm(`PERMANENTLY delete "${clientName}" and ALL their projects, tasks, invoices? This cannot be undone!`)) return;
            try {
                await api.delete(`/admin/deleted-clients/${clientId}`);
                showToast('Permanently deleted', 'success');
                fetchForView('deleted-clients');
            } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
        };

        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => setView('settings')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Deleted Clients</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body">
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 14, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <AlertTriangle size={18} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <strong>Restore</strong> will bring the client and all their projects/tasks back.
                            <strong> Permanent Delete</strong> will destroy all related data forever.
                        </div>
                    </div>
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)
                    ) : deletedClients.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No deleted clients</div></div>
                    ) : (
                        <div className="card-list">
                            {deletedClients.map(c => (
                                <div key={c.id} className="card-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || '—'} {c.company ? `• ${c.company}` : ''}</div>
                                        </div>
                                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10 }}>Deleted</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                                        Deleted on {new Date(c.deleted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {' • '}{c._count?.projects || 0} projects, {c._count?.invoices || 0} invoices
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-sm" style={{ flex: 1, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => handleRestore(c.id)}>
                                            <RotateCcw size={14} /> Restore
                                        </button>
                                        <button className="btn btn-sm" style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => handlePermanentDelete(c.id, c.name)}>
                                            <Trash2 size={14} /> Delete Forever
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // === SUB-VIEWS (Users, Plans, Coupons, Tax, Currencies) ===
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/users', form);
            showToast('User created!', 'success');
            setShowModal(null);
            setForm({});
            fetchForView('users');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };
    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/users/${form._editId}`, { role: form.role, is_active: form.is_active === 'true' || form.is_active === true });
            showToast('User updated!', 'success');
            setShowModal(null);
            setForm({});
            fetchForView('users');
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm_password) { showToast('Passwords do not match', 'error'); return; }
        try {
            await api.post(`/admin/users/${form._resetId}/reset-password`, { password: form.password });
            showToast('Password reset!', 'success');
            setShowModal(null);
            setForm({});
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
    };

    const subViews = {
        users: {
            title: 'User Management',
            data: users,
            canCreate: true,
            onCreateOpen: () => { setForm({ email: '', password: '', first_name: '', last_name: '', role: 'DEVELOPER' }); setShowModal('create-user'); },
            renderItem: (u) => (
                <div key={u.id} className="card-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="card-item-avatar">{u.first_name?.[0]}{u.last_name?.[0]}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <span className="badge badge-blue" style={{ fontSize: 10 }}>{u.role?.replace('_', ' ')}</span>
                                <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                <button onClick={() => { setForm({ _editId: u.id, role: u.role, is_active: String(u.is_active) }); setShowModal('edit-user'); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '2px 6px' }}>Edit</button>
                                <button onClick={() => { setForm({ _resetId: u.id, _resetName: `${u.first_name} ${u.last_name}`, password: '', confirm_password: '' }); setShowModal('reset-password'); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '2px 6px' }}>Reset Pwd</button>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        plans: {
            title: 'Service Plans',
            data: plans,
            canCreate: true,
            onCreateOpen: () => { setForm({ name: '', description: '', price: '' }); setShowModal('plan'); },
            renderItem: (p) => (
                <div key={p.id} className="card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.description || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>₹{Number(p.price).toLocaleString()}</span>
                            <button onClick={() => handleDelete('plans', p.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            ),
        },
        coupons: {
            title: 'Discount Coupons',
            data: coupons,
            canCreate: true,
            onCreateOpen: () => { setForm({ code: '', discount_percent: '', valid_until: '' }); setShowModal('coupon'); },
            renderItem: (c) => (
                <div key={c.id} className="card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: 2 }}>{c.code}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.valid_until ? `Expires ${new Date(c.valid_until).toLocaleDateString()}` : 'No expiry'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="badge badge-green">{c.discount_percent}% off</span>
                            <button onClick={() => handleDelete('coupons', c.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            ),
        },
        taxes: {
            title: 'Tax Configuration',
            data: taxes,
            canCreate: true,
            onCreateOpen: () => { setForm({ name: '', rate: '', is_default: 'false' }); setShowModal('tax'); },
            renderItem: (t) => (
                <div key={t.id} className="card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            {t.is_default && <span className="badge badge-blue" style={{ fontSize: 10, marginTop: 4 }}>Default</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700 }}>{t.rate}%</span>
                            <button onClick={() => handleDelete('taxes', t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            ),
        },
        currencies: {
            title: 'Currencies',
            data: currencies,
            canCreate: true,
            onCreateOpen: () => { setForm({ code: '', name: '', symbol: '', is_default: 'false' }); setShowModal('currency'); },
            renderItem: (c) => (
                <div key={c.id} className="card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.code} ({c.symbol})</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {c.is_default && <span className="badge badge-blue" style={{ fontSize: 10 }}>Default</span>}
                            <button onClick={() => handleDelete('currencies', c.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                </div>
            ),
        },
    };

    const sv = subViews[view];
    if (!sv) { setView('settings'); return null; }

    return (
        <div className="page-enter">
            <div className="page-header">
                <button className="page-header-back" onClick={() => setView('settings')}><ArrowLeft size={20} /></button>
                <div className="page-header-title">{sv.title}</div>
                <div style={{ width: 36 }} />
            </div>
            <div className="page-body">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 16, marginBottom: 12 }} />)
                ) : (
                    <div className="card-list">
                        {sv.data.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-text">No items yet</div></div>
                        ) : sv.data.map(sv.renderItem)}
                    </div>
                )}
            </div>

            {sv.canCreate && (
                <button className="page-fab" onClick={sv.onCreateOpen}>
                    <Plus size={24} />
                </button>
            )}

            {/* Create User Modal */}
            {showModal === 'create-user' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>Create New User</div>
                        <form onSubmit={handleCreateUser}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" required value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" required value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" required minLength={6} value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-select" value={form.role || 'DEVELOPER'} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="ADMIN">Admin</option>
                                    <option value="PROJECT_MANAGER">Project Manager</option>
                                    <option value="DEVELOPER">Developer</option>
                                    <option value="DESIGNER">Designer</option>
                                    <option value="SALES">Sales</option>
                                    <option value="BILLING">Billing</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create User</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showModal === 'edit-user' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>Edit User</div>
                        <form onSubmit={handleEditUser}>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-select" value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="ADMIN">Admin</option>
                                    <option value="PROJECT_MANAGER">Project Manager</option>
                                    <option value="DEVELOPER">Developer</option>
                                    <option value="DESIGNER">Designer</option>
                                    <option value="SALES">Sales</option>
                                    <option value="BILLING">Billing</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.is_active || ''} onChange={e => setForm({ ...form, is_active: e.target.value })}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showModal === 'reset-password' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>Reset Password</div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Resetting password for <strong style={{ color: 'var(--text-primary)' }}>{form._resetName}</strong>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group"><label className="form-label">New Password *</label><input className="form-input" type="password" required minLength={6} value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Confirm Password *</label><input className="form-input" type="password" required minLength={6} value={form.confirm_password || ''} onChange={e => setForm({ ...form, confirm_password: e.target.value })} /></div>
                            <button className="btn btn-primary btn-block" type="submit">Reset Password</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Plan Modal */}
            {showModal === 'plan' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>New Service Plan</div>
                        <form onSubmit={handleCreatePlan}>
                            <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Price (₹)</label><input className="form-input" type="number" required value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                            <button className="btn btn-primary btn-block" type="submit">Create Plan</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Coupon Modal */}
            {showModal === 'coupon' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>New Coupon</div>
                        <form onSubmit={handleCreateCoupon}>
                            <div className="form-group"><label className="form-label">Code</label><input className="form-input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" /></div>
                            <div className="form-group"><label className="form-label">Discount (%)</label><input className="form-input" type="number" required value={form.discount_percent || ''} onChange={e => setForm({ ...form, discount_percent: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Valid Until</label><input className="form-input" type="date" value={form.valid_until || ''} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
                            <button className="btn btn-primary btn-block" type="submit">Create Coupon</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Tax Modal */}
            {showModal === 'tax' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>New Tax Config</div>
                        <form onSubmit={handleCreateTax}>
                            <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="GST" /></div>
                            <div className="form-group"><label className="form-label">Rate (%)</label><input className="form-input" type="number" step="0.01" required value={form.rate || ''} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Default?</label>
                                <select className="form-select" value={form.is_default || 'false'} onChange={e => setForm({ ...form, is_default: e.target.value })}><option value="false">No</option><option value="true">Yes</option></select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create Tax</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Currency Modal */}
            {showModal === 'currency' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 20 }}>New Currency</div>
                        <form onSubmit={handleCreateCurrency}>
                            <div className="form-group"><label className="form-label">Code</label><input className="form-input" required value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="USD" /></div>
                            <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" /></div>
                            <div className="form-group"><label className="form-label">Symbol</label><input className="form-input" required value={form.symbol || ''} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="$" /></div>
                            <div className="form-group"><label className="form-label">Default?</label>
                                <select className="form-select" value={form.is_default || 'false'} onChange={e => setForm({ ...form, is_default: e.target.value })}><option value="false">No</option><option value="true">Yes</option></select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create Currency</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
