import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, MoreVertical, Phone, Mail, Building, Tag, User, Clock, CheckCircle2, Edit, Trash2, ChevronRight } from 'lucide-react';

const STAGE_LABELS = { NEW: 'New Inquiry', CONTACTED: 'Contacted', PROPOSAL_SENT: 'Proposal Sent', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };
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

function getScoreBreakdown(lead) {
    const items = [];
    if (lead.company) items.push({ label: 'Company Name', points: 15, icon: '🏢' });
    if (lead.phone) items.push({ label: 'Verified Phone', points: 10, icon: '📞' });
    if (lead.source === 'REFERRAL') items.push({ label: 'Source: Referral', points: 25, icon: '🔗' });
    else if (lead.source === 'WEBSITE') items.push({ label: 'Source: Website', points: 15, icon: '🌐' });
    else if (lead.source === 'ADS') items.push({ label: 'Source: Ads', points: 10, icon: '📢' });
    else items.push({ label: 'Source: Manual', points: 5, icon: '✏️' });
    const remaining = lead.score - items.reduce((s, i) => s + i.points, 0);
    if (remaining > 0) items.push({ label: 'Engagement', points: remaining, icon: '⚡' });
    return items;
}

export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [converting, setConverting] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [form, setForm] = useState({});
    const [freezeWarning, setFreezeWarning] = useState(false);

    useEffect(() => { fetchLead(); }, [id]);

    const fetchLead = async () => {
        try {
            const { data } = await api.get(`/leads/${id}`);
            setLead(data);
            setForm({ name: data.name, email: data.email || '', phone: data.phone || '', company: data.company || '', notes: data.notes || '', stage: data.stage });
        } catch { showToast('Lead not found', 'error'); navigate('/leads'); }
        setLoading(false);
    };

    const handleConvert = async () => {
        setConverting(true);
        try {
            await api.post(`/leads/${id}/convert`);
            showToast('Lead converted to client!', 'success');
            navigate('/clients');
        } catch (err) {
            showToast(err.response?.data?.error || 'Conversion failed', 'error');
        }
        setConverting(false);
    };

    const handleUpdate = async () => {
        // Show inline warning if moving a WON (converted) lead to another stage
        if (lead.stage === 'WON' && form.stage && form.stage !== 'WON' && lead.converted_client && !freezeWarning) {
            setFreezeWarning(true);
            return;
        }
        try {
            await api.put(`/leads/${id}`, form);
            showToast('Lead updated', 'success');
            setShowEdit(false);
            setFreezeWarning(false);
            fetchLead();
        } catch (err) {
            showToast(err.response?.data?.error || 'Update failed', 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            showToast('Lead deleted', 'success');
            navigate('/leads');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    if (loading || !lead) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => navigate('/leads')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Lead Details</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body">
                    <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
                </div>
            </div>
        );
    }

    const scoreBreakdown = getScoreBreakdown(lead);

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="page-header">
                <button className="page-header-back" onClick={() => navigate('/leads')}><ArrowLeft size={20} /></button>
                <div className="page-header-title">Lead Details</div>
                <button className="page-header-action" onClick={() => {
                    setForm({ name: lead.name, email: lead.email || '', phone: lead.phone || '', company: lead.company || '', notes: lead.notes || '', stage: lead.stage });
                    setFreezeWarning(false);
                    setShowEdit(true);
                }}><Edit size={18} /></button>
            </div>

            <div className="page-body">
                {/* Profile Section */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
                        background: `linear-gradient(135deg, ${STAGE_COLORS[lead.stage]}44, ${STAGE_COLORS[lead.stage]}22)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 800, color: STAGE_COLORS[lead.stage],
                        border: `2px solid ${STAGE_COLORS[lead.stage]}44`
                    }}>
                        {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{lead.name}</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: `${STAGE_COLORS[lead.stage]}22`, color: STAGE_COLORS[lead.stage] }}>
                            {STAGE_LABELS[lead.stage]}
                        </span>
                        <span className={`score-badge ${getScoreClass(lead.score)}`}>Score: {lead.score}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Added {timeAgo(lead.created_at)}
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="score-breakdown" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>Score Breakdown</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{lead.score}/100</span>
                    </div>
                    {scoreBreakdown.map((item, i) => (
                        <div key={i} className="score-breakdown-row">
                            <span className="score-breakdown-label">{item.icon} {item.label}</span>
                            <span className="score-breakdown-value">+{item.points}</span>
                        </div>
                    ))}
                    <div className="score-progress">
                        {scoreBreakdown.map((item, i) => (
                            <div key={i} className="score-segment" style={{ flex: item.points, background: i % 2 === 0 ? '#3b82f6' : '#10b981' }} />
                        ))}
                    </div>
                </div>

                {/* Convert CTA */}
                {lead.converted_client ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                        background: lead.converted_client.frozen ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        borderRadius: 14, marginBottom: 24,
                        border: `1px solid ${lead.converted_client.frozen ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`
                    }}>
                        {lead.converted_client.frozen ? (
                            <span style={{ fontSize: 20 }}>❄️</span>
                        ) : (
                            <CheckCircle2 size={20} color="#10b981" />
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: lead.converted_client.frozen ? '#f59e0b' : '#10b981' }}>
                                {lead.converted_client.frozen ? 'Client Frozen' : 'Converted to Client'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {lead.converted_client.name}{lead.converted_client.frozen ? ' — Move back to WON to restore' : ''}
                            </div>
                        </div>
                        {!lead.converted_client.frozen && (
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 14px', fontSize: 13 }}
                                onClick={() => navigate(`/clients/${lead.converted_client.id}`)}
                            >
                                View Client
                            </button>
                        )}
                    </div>
                ) : lead.stage !== 'LOST' ? (
                    <button className="btn btn-primary btn-block btn-lg" style={{ marginBottom: 24 }} onClick={handleConvert} disabled={converting}>
                        <CheckCircle2 size={20} />
                        {converting ? 'Converting...' : 'Convert to Client'}
                    </button>
                ) : null}

                {/* Tabs */}
                <div className="tab-bar">
                    <button className={`tab-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
                    <button className={`tab-item ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
                    <button className={`tab-item ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>Files</button>
                </div>

                {/* Info Tab */}
                {activeTab === 'info' && (
                    <div className="card-list">
                        <div className="glass-card" style={{ padding: 16 }}>
                            {[
                                { icon: Mail, label: 'Email', value: lead.email },
                                { icon: Phone, label: 'Phone', value: lead.phone || 'Not provided' },
                                { icon: Building, label: 'Company', value: lead.company || 'Not provided' },
                                { icon: Tag, label: 'Source', value: SOURCE_LABELS[lead.source] || lead.source },
                                { icon: User, label: 'Assigned', value: lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : 'Unassigned' },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <item.icon size={16} color="var(--text-muted)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                                        <div style={{ fontSize: 15 }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {lead.lost_reason && (
                            <div className="glass-card" style={{ padding: 16, borderLeft: '4px solid var(--color-danger)' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4 }}>Lost Reason</div>
                                <div style={{ fontSize: 14 }}>{lead.lost_reason}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div>
                        {lead.notes ? (
                            <div className="glass-card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 6, borderRadius: 3, background: 'var(--color-primary)' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Notes</div>
                                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{lead.notes}</p>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{timeAgo(lead.created_at)}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No notes yet</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                    <div>
                        {lead.attachments && lead.attachments.length > 0 ? (
                            lead.attachments.map((f, i) => (
                                <div key={i} className="glass-card" style={{ padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📄</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{f.filename}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(f.file_size / 1024).toFixed(0)} KB</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-text">No files attached</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Delete */}
                <button className="btn btn-secondary btn-block" style={{ marginTop: 32, color: 'var(--color-danger)' }} onClick={handleDelete}>
                    <Trash2 size={16} />
                    Delete Lead
                </button>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Edit Lead</div>
                            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={form.name || ''} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stage</label>
                                <select className="form-input" value={form.stage || 'NEW'} onChange={e => { const val = e.target.value; setForm(prev => ({ ...prev, stage: val })); }}>
                                    <option value="NEW">New Inquiry</option>
                                    <option value="CONTACTED">Contacted</option>
                                    <option value="PROPOSAL_SENT">Proposal Sent</option>
                                    <option value="NEGOTIATION">Negotiation</option>
                                    <option value="WON">Won</option>
                                    <option value="LOST">Lost</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" value={form.email || ''} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone || ''} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input className="form-input" value={form.company || ''} onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                            </div>
                            {freezeWarning && (
                                <div style={{
                                    padding: '12px 16px', marginBottom: 12, borderRadius: 10,
                                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)'
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                                        ❄️ Client will be frozen
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                        Moving "{lead.name}" out of WON will freeze the client "{lead.converted_client?.name}".
                                        Data is preserved and will restore when moved back to WON.
                                    </div>
                                </div>
                            )}
                            {freezeWarning ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setFreezeWarning(false)}>Cancel</button>
                                    <button className="btn btn-primary" style={{ flex: 1, background: '#f59e0b' }} onClick={handleUpdate}>Confirm & Save</button>
                                </div>
                            ) : (
                                <button className="btn btn-primary btn-block" onClick={handleUpdate}>Save Changes</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
