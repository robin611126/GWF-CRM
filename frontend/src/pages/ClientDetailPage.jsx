import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Edit, Mail, Phone, Globe, Building, Hash, MapPin, Briefcase, Lock, Eye, EyeOff, Trash2, FileText, Plus, FolderKanban } from 'lucide-react';

const STATUS_COLORS = { UNPAID: '#64748b', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444' };
const STATUS_LABELS = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', OVERDUE: 'Overdue' };

export default function ClientDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [form, setForm] = useState({});

    useEffect(() => { fetchClient(); fetchInvoices(); }, [id]);

    const fetchInvoices = async () => {
        try {
            const { data } = await api.get(`/invoices?client_id=${id}&limit=50`);
            setInvoices(data.invoices || data);
        } catch { /* ignore */ }
    };

    const fetchClient = async () => {
        try {
            const { data } = await api.get(`/clients/${id}`);
            setClient(data);
            setForm({ name: data.name, email: data.email, phone: data.phone || '', company: data.company || '', industry: data.industry || '', website: data.website || '', gst_number: data.gst_number || '' });
        } catch { showToast('Client not found', 'error'); navigate('/clients'); }
        setLoading(false);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/clients/${id}`, form);
            showToast('Client updated', 'success');
            setShowEdit(false);
            fetchClient();
        } catch (err) {
            showToast(err.response?.data?.error || 'Update failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/clients/${id}`);
            showToast('Client deleted', 'success');
            navigate('/clients');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error deleting client', 'error');
        }
    };

    if (loading || !client) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => navigate('/clients')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Client Profile</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
            </div>
        );
    }

    const infoFields = [
        { icon: Mail, label: 'Email', value: client.email },
        { icon: Phone, label: 'Phone', value: client.phone || '—' },
        { icon: Building, label: 'Company', value: client.company || '—' },
        { icon: Briefcase, label: 'Industry', value: client.industry || '—' },
        { icon: Globe, label: 'Website', value: client.website || '—' },
        { icon: Hash, label: 'GST Number', value: client.gst_number || '—' },
    ];

    return (
        <div className="page-enter">
            <div className="page-header">
                <button className="page-header-back" onClick={() => navigate('/clients')}><ArrowLeft size={20} /></button>
                <div className="page-header-title">Client Profile</div>
                <button className="page-header-action" onClick={() => setShowEdit(true)}><Edit size={18} /></button>
            </div>

            <div className="page-body">
                {/* Profile Header */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 800, color: '#34d399',
                        border: '2px solid rgba(16,185,129,0.3)'
                    }}>
                        {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{client.name}</h2>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>{client.company || client.email}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                        <span className="badge badge-green">Active</span>
                        <span className="badge badge-blue">Member since {new Date(client.created_at).getFullYear()}</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                        <div className="kpi-label">Projects</div>
                        <div className="kpi-value" style={{ fontSize: 24 }}>{client._count?.projects || client.projects?.length || 0}</div>
                    </div>
                    <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                        <div className="kpi-label">Invoices</div>
                        <div className="kpi-value" style={{ fontSize: 24 }}>{client._count?.invoices || client.invoices?.length || 0}</div>
                    </div>
                    <div className="kpi-card" style={{ flex: 1, textAlign: 'center' }}>
                        <div className="kpi-label">Total Billed</div>
                        <div className="kpi-value" style={{ fontSize: 18 }}>₹{((client?.invoices || []).reduce((s, i) => s + Number(i.total_amount), 0)).toLocaleString('en-IN')}</div>
                    </div>
                </div>

                {/* Quick Actions Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => navigate('/invoices', { state: { openCreate: true, prefillClient: client.id } })}>
                        <Plus size={16} /> Create Invoice
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => navigate('/projects', { state: { openCreate: true, prefillClient: client.id } })}>
                        <FolderKanban size={16} /> Create Project
                    </button>
                </div>

                {/* Company Details */}
                <div className="section-header"><div className="section-title">Company Details</div></div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                    {infoFields.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < infoFields.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
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

                {/* Infrastructure / Credentials */}
                {(client.hosting_credentials || client.hosting_provider || client.domain_registrar) && (
                    <>
                        <div className="section-header">
                            <div className="section-title">Infrastructure</div>
                            <button className="section-action" onClick={() => setShowCredentials(!showCredentials)}>
                                {showCredentials ? <EyeOff size={16} /> : <Eye size={16} />}
                                <span style={{ marginLeft: 4 }}>{showCredentials ? 'Hide' : 'Show'}</span>
                            </button>
                        </div>
                        <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                            {client.hosting_provider && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <Lock size={16} color="var(--text-muted)" />
                                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hosting</div><div style={{ fontSize: 14 }}>{showCredentials ? client.hosting_provider : '••••••'}</div></div>
                                </div>
                            )}
                            {client.domain_registrar && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <Globe size={16} color="var(--text-muted)" />
                                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Domain Registrar</div><div style={{ fontSize: 14 }}>{showCredentials ? client.domain_registrar : '••••••'}</div></div>
                                </div>
                            )}
                            {client.hosting_credentials && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                                    <Lock size={16} color="var(--text-muted)" />
                                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Credentials</div><div style={{ fontSize: 14, fontFamily: 'monospace' }}>{showCredentials ? client.hosting_credentials : '••••••••••'}</div></div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Projects */}
                {client.projects?.length > 0 && (
                    <>
                        <div className="section-header"><div className="section-title">Projects</div></div>
                        <div className="card-list" style={{ marginBottom: 24 }}>
                            {client.projects.map(p => (
                                <div key={p.id} className="card-item" onClick={() => navigate(`/projects/${p.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Budget: ₹{Number(p.budget || 0).toLocaleString()}</div>
                                        </div>
                                        <span className={`badge ${p.status === 'COMPLETED' ? 'badge-green' : p.status === 'ON_HOLD' ? 'badge-yellow' : 'badge-blue'}`}>{p.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Invoices */}
                <>
                    <div className="section-header">
                        <div className="section-title">Invoices</div>
                        <button className="section-action" onClick={() => navigate('/invoices', { state: { openCreate: true } })}>
                            <Plus size={14} /> New Invoice
                        </button>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="glass-card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                            No invoices yet
                        </div>
                    ) : (
                        <div className="card-list" style={{ marginBottom: 24 }}>
                            {invoices.map(inv => {
                                const total = Number(inv.total_amount);
                                const paid = Number(inv.amount_paid || 0);
                                const due = total - paid;
                                const paidPct = total > 0 ? (paid / total) * 100 : 0;
                                const isOverdue = new Date(inv.due_date) < new Date() && inv.status === 'UNPAID';
                                const status = isOverdue ? 'OVERDUE' : inv.status;
                                return (
                                    <div key={inv.id} className="card-item" onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <FileText size={14} color="var(--text-muted)" /> {inv.invoice_number}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    Due {new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, fontSize: 15 }}>₹{total.toLocaleString('en-IN')}</div>
                                                {status !== 'PAID' && <div style={{ fontSize: 11, color: STATUS_COLORS[status], fontWeight: 600 }}>₹{due.toLocaleString('en-IN')} due</div>}
                                                <span className="badge" style={{ background: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status], fontSize: 10, marginTop: 2 }}>
                                                    {STATUS_LABELS[status]}
                                                </span>
                                            </div>
                                        </div>
                                        {status !== 'PAID' && paid > 0 && (
                                            <div style={{ marginTop: 8, background: 'var(--bg-tertiary)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${paidPct}%`, height: '100%', borderRadius: 4, background: '#f59e0b', transition: 'width 0.5s ease' }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>

                {/* Delete */}
                <button className="btn btn-secondary btn-block" style={{ marginTop: 32, color: 'var(--color-danger)' }} onClick={() => setShowDelete(true)}>
                    <Trash2 size={16} />
                    Delete Client
                </button>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Edit Client</div>
                            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Industry</label>
                                    <input className="form-input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Company</label>
                                <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">GST Number</label>
                                    <input className="form-input" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDelete && (
                <div className="modal-overlay" onClick={() => setShowDelete(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Trash2 size={20} /> Delete Client
                            </div>
                            <button onClick={() => setShowDelete(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 0', fontSize: 15, lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>{client.name}</strong>?
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
                                ⚠️ This action will remove the client from the system. If this client was converted from a lead, that lead will become available to convert again.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Client</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
