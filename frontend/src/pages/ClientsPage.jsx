import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Search, Plus, UserCheck, Building, Eye, Trash2, LayoutGrid, List, Mail, Phone, Snowflake } from 'lucide-react';
import PullToRefresh from '../components/PullToRefresh';

export default function ClientsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('table');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteBulk, setDeleteBulk] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', industry: '', website: '', gst_number: '' });

    useEffect(() => {
        fetchClients();
        if (location.state?.openCreate) setShowCreate(true);
    }, []);

    const fetchClients = async () => {
        try {
            const { data } = await api.get('/clients');
            setClients(data.clients || data);
        } catch { showToast('Error loading clients', 'error'); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/clients', form);
            showToast('Client created!', 'success');
            setShowCreate(false);
            setForm({ name: '', email: '', phone: '', company: '', industry: '', website: '', gst_number: '' });
            fetchClients();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const confirmBulkDelete = async () => {
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/clients/${id}`)));
            showToast('Clients deleted successfully', 'success');
            setSelectedIds([]);
            setDeleteBulk(false);
            fetchClients();
        } catch (err) {
            showToast('Error deleting clients', 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filtered.map(c => c.id));
        else setSelectedIds([]);
    };

    const handleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const filtered = clients.filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q);
    });

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Clients</div></div>
                <div className="page-body">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Clients</div>
                <div className="mobile-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge badge-blue">{clients.length}</span>
                    <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px' }}>
                        <button className={`mobile-header-icon ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} style={{ background: viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent' }}>
                            <List size={18} />
                        </button>
                        <button className={`mobile-header-icon ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} style={{ background: viewMode === 'cards' ? 'var(--bg-elevated)' : 'transparent' }}>
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <PullToRefresh onRefresh={fetchClients}>
                <div className="page-body">
                    <div className="search-bar">
                        <Search size={18} color="var(--text-muted)" />
                        <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedIds.length} selected</span>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-danger" style={{ padding: '6px 12px', minHeight: 'unset' }} onClick={() => setDeleteBulk(true)}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    )}

                    {viewMode === 'cards' ? (
                        <div className="card-list">
                            {filtered.length === 0 ? (
                                <div className="empty-state"><div className="empty-state-text">No clients found</div></div>
                            ) : filtered.map(c => (
                                <div key={c.id} className="card-item" onClick={() => navigate(`/clients/${c.id}`)}>
                                    <div className="card-item-header">
                                        <div className="card-item-avatar" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div className="card-item-info">
                                            <div className="card-item-name">{c.name}</div>
                                            <div className="card-item-sub">{c.company || c.email}</div>
                                            {/* Quick Actions */}
                                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                                {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Mail size={14} /> Email</a>}
                                                {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Phone size={14} /> Call</a>}
                                            </div>
                                        </div>
                                        <div className="card-item-meta">
                                            {c.frozen ? (
                                                <span className="badge" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><Snowflake size={10} /> Frozen</span>
                                            ) : (
                                                <span className="badge badge-green" style={{ fontSize: 10 }}>Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {c.industry && <span className="badge badge-gray">{c.industry}</span>}
                                        {c._count?.projects > 0 && <span className="badge badge-blue">{c._count.projects} Project{c._count.projects > 1 ? 's' : ''}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table View */
                        <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', width: 40 }}>
                                            <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                                        </th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Company</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Industry</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Projects</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/clients/${c.id}`)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)} style={{ cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                                                    {c.frozen && <span className="badge" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontSize: 9, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Snowflake size={9} /> Frozen</span>}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{c.company || '-'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {c.industry ? <span className="badge badge-gray">{c.industry}</span> : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {c._count?.projects > 0 ? <span className="badge badge-blue">{c._count.projects}</span> : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </PullToRefresh>

            <button className="page-fab" onClick={() => setShowCreate(true)}>
                <Plus size={24} />
            </button>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">New Client</div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Industry</label>
                                    <input className="form-input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Industry" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="www.example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">GST Number</label>
                                    <input className="form-input" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} placeholder="GST" />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create Client</button>
                        </form>
                    </div>
                </div>
            )}

            {deleteBulk && (
                <div className="modal-overlay" onClick={() => setDeleteBulk(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Trash2 size={20} /> Delete Clients
                            </div>
                            <button onClick={() => setDeleteBulk(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 0', fontSize: 15, lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>{selectedIds.length}</strong> selected clients?
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
                                ⚠️ This action will remove these clients from the system. Any leads directly converted into these clients will become available to convert again.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteBulk(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmBulkDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
