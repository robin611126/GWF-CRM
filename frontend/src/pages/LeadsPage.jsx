import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, Plus, TrendingUp, Filter, LayoutGrid, List, Kanban, CheckSquare, Trash2, Edit2, Mail, Phone } from 'lucide-react';
import SwipeableItem from '../components/SwipeableItem';
import PullToRefresh from '../components/PullToRefresh';

const STAGES = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'];
const STAGE_LABELS = { NEW: 'New', CONTACTED: 'Contacted', PROPOSAL_SENT: 'Proposal Sent', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };
const STAGE_COLORS = { NEW: '#3b82f6', CONTACTED: '#8b5cf6', PROPOSAL_SENT: '#f59e0b', NEGOTIATION: '#06b6d4', WON: '#10b981', LOST: '#ef4444' };
const SOURCE_LABELS = { MANUAL: 'Manual', WEBSITE: 'Website', REFERRAL: 'Referral', ADS: 'Ads' };

function getScoreClass(score) {
    if (score >= 60) return 'score-high';
    if (score >= 30) return 'score-medium';
    return 'score-low';
}

function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function LeadsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [pipeline, setPipeline] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeStage, setActiveStage] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showLostModal, setShowLostModal] = useState(null);
    const [lostReason, setLostReason] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'cards', 'kanban', 'table'
    const [selectedIds, setSelectedIds] = useState([]);
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'MANUAL', notes: '' });

    useEffect(() => {
        fetchData();
        if (location.state?.openCreate) setShowCreate(true);
    }, []);

    const fetchData = async () => {
        try {
            const { data } = await api.get('/leads/kanban');
            setPipeline(data);
        } catch (e) { showToast('Error loading leads', 'error'); }
        setLoading(false);
    };

    const allLeads = Object.values(pipeline).flat();
    const stageCounts = {};
    STAGES.forEach(s => { stageCounts[s] = (pipeline[s] || []).length; });

    const filteredLeads = (activeStage === 'ALL' ? allLeads : (pipeline[activeStage] || [])).filter(l => {
        if (!search) return true;
        const q = search.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.company || '').toLowerCase().includes(q);
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.email) delete payload.email;
            if (!payload.phone) delete payload.phone;
            if (!payload.company) delete payload.company;
            if (!payload.notes) delete payload.notes;

            await api.post('/leads', payload);
            showToast('Lead created!', 'success');
            setShowCreate(false);
            setForm({ name: '', email: '', phone: '', company: '', source: 'MANUAL', notes: '' });
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error creating lead', 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filteredLeads.map(l => l.id));
        else setSelectedIds([]);
    };

    const handleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} leads?`)) return;
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/leads/${id}`)));
            showToast('Leads deleted successfully', 'success');
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            showToast('Error deleting leads', 'error');
        }
    };

    const handleDeleteLead = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            showToast('Lead deleted', 'success');
            fetchData();
        } catch (err) {
            showToast('Error deleting lead', 'error');
        }
    };

    const handleBulkStage = async (e) => {
        const stage = e.target.value;
        if (!stage) return;
        try {
            await Promise.all(selectedIds.map(id => api.patch(`/leads/${id}/stage`, { stage })));
            showToast('Leads updated successfully', 'success');
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            showToast('Error updating leads', 'error');
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;
        const newStage = destination.droppableId;
        if (newStage === 'LOST') {
            setShowLostModal(draggableId);
            return;
        }
        try {
            await api.patch(`/leads/${draggableId}/stage`, { stage: newStage });
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating stage', 'error');
        }
    };

    const handleLostConfirm = async () => {
        if (!lostReason.trim()) { showToast('Reason required', 'error'); return; }
        try {
            await api.patch(`/leads/${showLostModal}/stage`, { stage: 'LOST', lost_reason: lostReason });
            setShowLostModal(null);
            setLostReason('');
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header">
                    <div className="mobile-header-title">Lead Pipeline</div>
                </div>
                <div className="page-body">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="mobile-header">
                <div className="mobile-header-title">Lead Pipeline</div>
                <div className="mobile-header-actions" style={{ display: 'flex', gap: '8px' }}>
                    <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px' }}>
                        <button className={`mobile-header-icon ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} style={{ background: viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent' }}>
                            <List size={18} />
                        </button>
                        <button className={`mobile-header-icon ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} style={{ background: viewMode === 'cards' ? 'var(--bg-elevated)' : 'transparent' }}>
                            <LayoutGrid size={18} />
                        </button>
                        <button className={`mobile-header-icon ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')} style={{ background: viewMode === 'kanban' ? 'var(--bg-elevated)' : 'transparent' }}>
                            <Kanban size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <PullToRefresh onRefresh={fetchData}>
                <div className="page-body">
                    {/* Search */}
                    <div className="search-bar">
                        <Search size={18} color="var(--text-muted)" />
                        <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {/* KPI Row */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <div className="kpi-card" style={{ flex: 1 }}>
                            <div className="kpi-label">Total Leads</div>
                            <div className="kpi-value" style={{ fontSize: 24 }}>{allLeads.length}</div>
                        </div>
                        <div className="kpi-card" style={{ flex: 1 }}>
                            <div className="kpi-label">Avg Score</div>
                            <div className="kpi-value" style={{ fontSize: 24 }}>{allLeads.length ? (allLeads.reduce((s, l) => s + l.score, 0) / allLeads.length).toFixed(1) : '0'}</div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="filter-tabs">
                        <button className={`filter-tab ${activeStage === 'ALL' ? 'active' : ''}`} onClick={() => setActiveStage('ALL')}>
                            All <span className="filter-tab-count">{allLeads.length}</span>
                        </button>
                        {STAGES.map(s => (
                            <button key={s} className={`filter-tab ${activeStage === s ? 'active' : ''}`} onClick={() => setActiveStage(s)}>
                                {STAGE_LABELS[s]} <span className="filter-tab-count">{stageCounts[s] || 0}</span>
                            </button>
                        ))}
                    </div>

                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedIds.length} selected</span>
                            <div style={{ flex: 1 }} />
                            <select className="form-select" style={{ maxWidth: 150, padding: '6px 12px', minHeight: 'unset' }} onChange={handleBulkStage} value="">
                                <option value="" disabled>Change Stage...</option>
                                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                            </select>
                            <button className="btn btn-danger" style={{ padding: '6px 12px', minHeight: 'unset' }} onClick={handleBulkDelete}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    )}

                    {/* Card View */}
                    {viewMode === 'cards' ? (
                        <div className="card-list">
                            {filteredLeads.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-text">No leads found</div>
                                </div>
                            ) : filteredLeads.map(lead => {
                                const leftActions = [];
                                if (lead.email) leftActions.push({ label: 'Email', icon: <Mail size={16} />, color: '#3b82f6', onClick: () => window.location.href = `mailto:${lead.email}` });
                                if (lead.phone) leftActions.push({ label: 'Call', icon: <Phone size={16} />, color: '#10b981', onClick: () => window.location.href = `tel:${lead.phone}` });

                                const rightActions = [
                                    { label: 'Delete', icon: <Trash2 size={16} />, color: '#ef4444', onClick: () => handleDeleteLead(lead.id) }
                                ];

                                return (
                                    <SwipeableItem key={lead.id} leftActions={leftActions.length ? leftActions : null} rightActions={rightActions}>
                                        <div className="card-item" onClick={() => navigate(`/leads/${lead.id}`)} style={{ border: 'none', borderRadius: 0 }}>
                                            <div className="card-item-header">
                                                <div className="card-item-avatar" style={{ background: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage] }}>
                                                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="card-item-info">
                                                    <div className="card-item-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {lead.name}
                                                        {lead.converted_client?.frozen && <span title="Client Frozen" style={{ fontSize: 14 }}>❄️</span>}
                                                    </div>
                                                    <div className="card-item-sub">{lead.company || lead.email}</div>
                                                    {/* Quick Actions */}
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                                        {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Mail size={14} /> Email</a>}
                                                        {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Phone size={14} /> Call</a>}
                                                    </div>
                                                </div>
                                                <div className="card-item-meta">
                                                    <span className={`score-badge ${getScoreClass(lead.score)}`}>Score: {lead.score}</span>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{timeAgo(lead.updated_at)}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span className="badge" style={{ background: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage] }}>
                                                    {STAGE_LABELS[lead.stage]}
                                                </span>
                                                {lead.converted_client?.frozen && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10 }}>❄️ Frozen</span>}
                                                {lead.source && <span className="badge badge-gray" style={{ fontSize: 10 }}>{SOURCE_LABELS[lead.source] || lead.source}</span>}
                                            </div>
                                        </div>
                                    </SwipeableItem>
                                )
                            })}
                        </div>
                    ) : viewMode === 'table' ? (
                        /* Table View */
                        <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', width: 40 }}>
                                            <input type="checkbox" checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                                        </th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Company</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Stage</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Score</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map(lead => (
                                        <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead.id}`)} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => handleSelect(lead.id)} style={{ cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {lead.name}
                                                    {lead.converted_client?.frozen && <span title="Client Frozen" style={{ fontSize: 14 }}>❄️</span>}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.email}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{lead.company || '-'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span className="badge" style={{ background: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage] }}>
                                                        {STAGE_LABELS[lead.stage]}
                                                    </span>
                                                    {lead.converted_client?.frozen && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10 }}>❄️ Frozen</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className={`score-badge ${getScoreClass(lead.score)}`}>{lead.score}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>{timeAgo(lead.updated_at)}</td>
                                        </tr>
                                    ))}
                                    {filteredLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No leads found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Kanban View */
                        <DragDropContext onDragEnd={onDragEnd}>
                            <div className="kanban-board">
                                {STAGES.map(stage => (
                                    <Droppable key={stage} droppableId={stage}>
                                        {(provided) => (
                                            <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                                                <div className="kanban-column-header" style={{ background: `${STAGE_COLORS[stage]}15`, color: STAGE_COLORS[stage] }}>
                                                    {STAGE_LABELS[stage]}
                                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{(pipeline[stage] || []).length}</span>
                                                </div>
                                                {(pipeline[stage] || []).map((lead, idx) => (
                                                    <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                                                        {(prov) => (
                                                            <div
                                                                className="kanban-card"
                                                                ref={prov.innerRef}
                                                                {...prov.draggableProps}
                                                                {...prov.dragHandleProps}
                                                                onClick={() => navigate(`/leads/${lead.id}`)}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        {lead.name}
                                                                        {lead.converted_client?.frozen && <span title="Client Frozen" style={{ fontSize: 12 }}>❄️</span>}
                                                                    </div>
                                                                    <span className={`score-badge ${getScoreClass(lead.score)}`} style={{ fontSize: 11 }}>{lead.score}</span>
                                                                </div>
                                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.company || lead.email}</div>
                                                                {lead.converted_client?.frozen && <div style={{ marginTop: 4 }}><span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, padding: '2px 6px' }}>❄️ Frozen</span></div>}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                ))}
                            </div>
                        </DragDropContext>
                    )}
                </div>
            </PullToRefresh>

            {/* FAB */}
            <button className="page-fab" onClick={() => setShowCreate(true)}>
                <Plus size={24} />
            </button>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">New Lead</div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Source</label>
                                    <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                        <option value="MANUAL">Manual</option>
                                        <option value="WEBSITE">Website</option>
                                        <option value="REFERRAL">Referral</option>
                                        <option value="ADS">Ads</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes about this lead..." style={{ resize: 'vertical' }} />
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Create Lead</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Lost Reason Modal */}
            {showLostModal && (
                <div className="modal-overlay" onClick={() => { setShowLostModal(null); setLostReason(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 16 }}>Mark as Lost</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Please provide a reason for losing this lead.</p>
                        <textarea className="form-input" rows={3} value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Reason..." style={{ resize: 'vertical', marginBottom: 16 }} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowLostModal(null); setLostReason(''); }}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleLostConfirm}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
