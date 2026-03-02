import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Search, Plus, FolderKanban, LayoutGrid, List, Trash2 } from 'lucide-react';

const STATUS_LABELS = { PLANNING: 'Planning', DESIGN: 'Design', DEVELOPMENT: 'Development', REVIEW: 'Review', COMPLETED: 'Completed', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled' };
const STATUS_COLORS = { PLANNING: '#8b5cf6', DESIGN: '#f59e0b', DEVELOPMENT: '#3b82f6', REVIEW: '#06b6d4', COMPLETED: '#10b981', ON_HOLD: '#f59e0b', CANCELLED: '#ef4444' };

export default function ProjectsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [selectedIds, setSelectedIds] = useState([]);
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({ title: '', client_id: '', description: '', budget: '', start_date: '', end_date: '' });

    useEffect(() => {
        fetchProjects();
        api.get('/clients?limit=100').then(({ data }) => setClients(data.clients || data)).catch(() => { });
        if (location.state?.openCreate) setShowCreate(true);
    }, []);

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/projects');
            setProjects(data.projects || data);
        } catch { showToast('Error loading projects', 'error'); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                budget: form.budget ? parseFloat(form.budget) : undefined,
                start_date: form.start_date || undefined,
                end_date: form.end_date || undefined,
            };
            await api.post('/projects', payload);
            showToast('Project created!', 'success');
            setShowCreate(false);
            setForm({ title: '', client_id: '', description: '', budget: '', start_date: '', end_date: '' });
            fetchProjects();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const handleStatusUpdate = async (projectId, newStatus) => {
        try {
            await api.put(`/projects/${projectId}`, { status: newStatus });
            setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
            showToast('Project status updated', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating status', 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filtered.map(p => p.id));
        else setSelectedIds([]);
    };

    const handleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} projects?`)) return;
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/projects/${id}`)));
            showToast('Projects deleted', 'success');
            setSelectedIds([]);
            fetchProjects();
        } catch (err) {
            showToast('Error deleting projects', 'error');
        }
    };

    const handleBulkStage = async (e) => {
        const status = e.target.value;
        if (!status) return;
        try {
            await Promise.all(selectedIds.map(id => api.put(`/projects/${id}`, { status })));
            showToast('Projects updated', 'success');
            setSelectedIds([]);
            fetchProjects();
        } catch (err) {
            showToast('Error updating projects', 'error');
        }
    };

    const statuses = ['ALL', ...Object.keys(STATUS_LABELS)];
    const statusCounts = {};
    statuses.forEach(s => {
        statusCounts[s] = s === 'ALL' ? projects.length : projects.filter(p => p.status === s).length;
    });

    const filtered = projects.filter(p => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (!search) return true;
        return p.title.toLowerCase().includes(search.toLowerCase());
    });

    const getTaskProgress = (project) => {
        const total = project._count?.tasks || 0;
        if (total === 0) return 0;
        // Use task count as a rough indicator
        return total;
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Projects</div></div>
                <div className="page-body">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Projects</div>
                <div className="mobile-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge badge-blue">{projects.length}</span>
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

            <div className="page-body">
                <div className="search-bar">
                    <Search size={18} color="var(--text-muted)" />
                    <input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Status Filter Tabs */}
                <div className="filter-tabs">
                    {statuses.filter(s => statusCounts[s] > 0 || s === 'ALL').map(s => (
                        <button key={s} className={`filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                            {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
                            <span className="filter-tab-count">{statusCounts[s]}</span>
                        </button>
                    ))}
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="bulk-actions-bar" style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedIds.length} selected</span>
                        <div style={{ flex: 1 }} />
                        <select className="form-select" style={{ maxWidth: 150, padding: '6px 12px', minHeight: 'unset' }} onChange={handleBulkStage} value="">
                            <option value="" disabled>Change Status...</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', minHeight: 'unset' }} onClick={handleBulkDelete}>
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                )}

                {viewMode === 'cards' ? (
                    <div className="card-list">
                        {filtered.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-text">No projects found</div></div>
                        ) : filtered.map(project => {
                            const taskCount = project._count?.tasks || 0;
                            return (
                                <div key={project.id} className="card-item" onClick={() => navigate(`/projects/${project.id}`)}>
                                    <div className="card-item-header">
                                        <div className="card-item-avatar" style={{ borderRadius: 14, background: `${STATUS_COLORS[project.status]}15`, color: STATUS_COLORS[project.status] }}>
                                            <FolderKanban size={22} />
                                        </div>
                                        <div className="card-item-info">
                                            <div className="card-item-name">{project.title}</div>
                                            <div className="card-item-sub">{project.client?.name || project.client?.company || '—'}</div>
                                        </div>
                                        <select
                                            className="form-select"
                                            style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: 12, borderRadius: 8 }}
                                            value={project.status}
                                            onChange={e => handleStatusUpdate(project.id, e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                                        {project.budget > 0 && <span>₹{Number(project.budget).toLocaleString()}</span>}
                                        {project.end_date && <span>Due {new Date(project.end_date).toLocaleDateString()}</span>}
                                    </div>

                                    {taskCount > 0 && (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {taskCount} task{taskCount > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', width: 40 }}>
                                        <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                                    </th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Client</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Tasks</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(project => {
                                    const taskCount = project._count?.tasks || 0;
                                    return (
                                        <tr key={project.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(project.id)} onChange={() => handleSelect(project.id)} style={{ cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{project.title}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{project.client?.name || project.client?.company || '-'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <select
                                                    className="form-select"
                                                    style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 12, borderRadius: 6, minHeight: 'unset' }}
                                                    value={project.status}
                                                    onChange={e => handleStatusUpdate(project.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{taskCount > 0 ? taskCount : '-'}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{project.end_date ? new Date(project.end_date).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No projects found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <button className="page-fab" onClick={() => setShowCreate(true)}>
                <Plus size={24} />
            </button>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">New Project</div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Project title" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select className="form-select" required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                                    <option value="">Select a client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Project description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Budget (₹)</label>
                                    <input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Deadline</label>
                                    <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create Project</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
