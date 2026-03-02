import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Search, Plus, AlertTriangle, FileText, Trash2, Download, Eye } from 'lucide-react';

const STATUS_LABELS = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
const STATUS_COLORS = { UNPAID: '#64748b', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', CANCELLED: '#64748b' };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function InvoicesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [showCreate, setShowCreate] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [clients, setClients] = useState([]);
    const [clientProjects, setClientProjects] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [form, setForm] = useState({ client_id: '', project_id: '', due_date: '', notes: '', tax_rate: 0, items: [{ description: '', quantity: 1, unit_price: 0 }] });

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchInvoices();
        api.get('/clients?limit=100').then(({ data }) => setClients(data.clients || data)).catch(() => { });
        api.get('/invoices/taxes').then(({ data }) => {
            setTaxes(data);
            const defaultTax = data.find(t => t.is_default);
            if (defaultTax) setForm(f => ({ ...f, tax_rate: defaultTax.rate }));
        }).catch(() => { });
        if (location.state?.openCreate) {
            setShowCreate(true);
            if (location.state.prefillClient) {
                setForm(f => ({ ...f, client_id: location.state.prefillClient, project_id: location.state.prefillProject || '' }));
                api.get(`/projects?client_id=${location.state.prefillClient}`)
                    .then(({ data }) => setClientProjects(data.projects || data))
                    .catch(() => setClientProjects([]));
            }
        }
    }, [location.state]);

    const fetchInvoices = async () => {
        try {
            const { data } = await api.get('/invoices');
            setInvoices(data.invoices || data);
        } catch { showToast('Error loading invoices', 'error'); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const validItems = form.items.filter(i => i.description && i.unit_price > 0);
        if (validItems.length === 0) { showToast('Add at least one item', 'error'); return; }
        try {
            await api.post('/invoices', { ...form, items: validItems });
            showToast('Invoice created!', 'success');
            setShowCreate(false);
            setForm({ client_id: '', project_id: '', due_date: '', notes: '', tax_rate: 0, items: [{ description: '', quantity: 1, unit_price: 0 }] });
            setClientProjects([]);
            fetchInvoices();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0 }] });
    const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i, field, val) => { const items = [...form.items]; items[i][field] = field === 'quantity' || field === 'unit_price' ? parseFloat(val) || 0 : val; setForm({ ...form, items }); };
    const subtotal = form.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
    const taxAmount = subtotal * (form.tax_rate || 0) / 100;
    const grandTotal = subtotal + taxAmount;

    const handleDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            await api.delete(`/invoices/${invoiceToDelete.id}`);
            showToast('Invoice deleted', 'success');
            setInvoiceToDelete(null);
            fetchInvoices();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error deleting invoice', 'error');
        }
    };

    const handleDownloadPDF = async (id, invoiceNumber) => {
        try {
            const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            showToast('Failed to download invoice', 'error');
        }
    };

    const handlePreviewPDF = async (id) => {
        try {
            const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (err) {
            showToast('Failed to preview invoice', 'error');
        }
    };

    // Stats
    const totalOutstanding = invoices.filter(i => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);
    const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;
    const overdueAmount = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);

    const filters = ['All', 'Overdue', 'Unpaid', 'Partial', 'Paid'];
    const filtered = invoices.filter(inv => {
        if (statusFilter !== 'All' && inv.status !== statusFilter.toUpperCase()) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (inv.invoice_number || '').toLowerCase().includes(q) ||
                (inv.client?.name || '').toLowerCase().includes(q) ||
                (inv.client?.company || '').toLowerCase().includes(q);
        }
        return true;
    });

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Invoices</div></div>
                <div className="page-body"><div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 16 }} />
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Invoices</div>
                <span className="badge badge-blue">{invoices.length}</span>
            </div>

            <div className="page-body">
                {/* Summary Card */}
                <div className="hero-card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={20} color="var(--text-muted)" />
                        </div>
                        {overdueCount > 0 && (
                            <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> {overdueCount} Overdue
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Total Outstanding</div>
                    <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                        <span><span style={{ color: '#ef4444' }}>●</span> ₹{(overdueAmount / 1000).toFixed(1)}k Overdue</span>
                        <span><span style={{ color: '#64748b' }}>●</span> ₹{((totalOutstanding - overdueAmount) / 1000).toFixed(1)}k Unpaid</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="form-input"
                        placeholder="Search invoices..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 40 }}
                    />
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {filters.map(f => (
                        <button key={f} className={`filter-tab ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>{f}</button>
                    ))}
                </div>

                {/* Invoice Cards */}
                <div className="section-header"><div className="section-title">Recent Invoices</div></div>
                <div className="card-list">
                    {filtered.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No invoices found</div></div>
                    ) : filtered.map(inv => {
                        const dueDate = new Date(inv.due_date);
                        const statusClass = inv.status === 'OVERDUE' ? 'status-overdue' : inv.status === 'PARTIAL' ? 'status-partial' : inv.status === 'PAID' ? 'status-paid' : 'status-unpaid';
                        const total = Number(inv.total_amount);
                        const paid = Number(inv.amount_paid || 0);
                        const due = total - paid;
                        const paidPct = total > 0 ? (paid / total) * 100 : 0;
                        const duePct = total > 0 ? (due / total) * 100 : 100;
                        return (
                            <div key={inv.id} className={`invoice-card ${statusClass}`} onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                    <div className="invoice-date-badge">
                                        <span className="invoice-date-month">{MONTHS[dueDate.getMonth()]}</span>
                                        <span className="invoice-date-day">{dueDate.getDate()}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{inv.client?.name || inv.client?.company || '—'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.invoice_number}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                        {inv.status !== 'PAID' && (
                                            <div style={{ fontSize: 11, color: STATUS_COLORS[inv.status] || '#64748b', fontWeight: 600 }}>
                                                ₹{due.toLocaleString('en-IN')} due ({duePct.toFixed(0)}%)
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="badge" style={{ background: `${STATUS_COLORS[inv.status]}22`, color: STATUS_COLORS[inv.status], fontSize: 10 }}>
                                                {STATUS_LABELS[inv.status]}
                                            </span>
                                            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handlePreviewPDF(inv.id); }} style={{ padding: '6px', minHeight: 'unset', borderRadius: '8px' }} title="Preview PDF">
                                                <Eye size={14} />
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv.id, inv.invoice_number); }} style={{ padding: '6px', minHeight: 'unset', borderRadius: '8px' }} title="Download PDF">
                                                <Download size={14} />
                                            </button>
                                            {paid === 0 && (
                                                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(inv); }} style={{ padding: '6px', minHeight: 'unset', borderRadius: '8px', color: 'var(--color-danger)' }} title="Delete Invoice">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Mini Progress Bar */}
                                {inv.status !== 'PAID' && paid > 0 && (
                                    <div style={{ marginTop: 10, background: 'var(--bg-tertiary)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${paidPct}%`, height: '100%', borderRadius: 4, background: paidPct >= 100 ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <button className="page-fab" onClick={() => setShowCreate(true)}>
                <Plus size={24} />
            </button>

            {/* Create Invoice Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '95vh' }}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Create Invoice</div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select className="form-select" required value={form.client_id} onChange={e => {
                                    const cid = e.target.value;
                                    setForm({ ...form, client_id: cid, project_id: '' });
                                    if (cid) {
                                        api.get(`/projects?client_id=${cid}`).then(({ data }) => setClientProjects(data.projects || data)).catch(() => setClientProjects([]));
                                    } else { setClientProjects([]); }
                                }}>
                                    <option value="">Select a client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                                </select>
                            </div>
                            {form.client_id && clientProjects.length > 0 && (
                                <div className="form-group">
                                    <label className="form-label">Project (optional)</label>
                                    <select className="form-select" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                                        <option value="">No project linked</option>
                                        {clientProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Due Date *</label>
                                <input className="form-input" type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tax</label>
                                <select className="form-select" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}>
                                    <option value={0}>No Tax</option>
                                    {taxes.map(t => <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>)}
                                </select>
                            </div>

                            <div className="section-header"><div className="section-title">Line Items</div><button className="section-action" type="button" onClick={addItem}>+ Add Item</button></div>
                            {form.items.map((item, i) => (
                                <div key={i} className="glass-card" style={{ padding: 14, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>Item {i + 1}</span>
                                        {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>}
                                    </div>
                                    <input className="form-input" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} style={{ marginBottom: 8 }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <input className="form-input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                                        <input className="form-input" type="number" min="0" placeholder="Price" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                                    </div>
                                </div>
                            ))}

                            <div className="glass-card" style={{ padding: 16, marginTop: 16, marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {form.tax_rate > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        <span>Tax ({form.tax_rate}%)</span>
                                        <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: form.tax_rate > 0 ? '1px solid var(--border-color)' : 'none', paddingTop: form.tax_rate > 0 ? 8 : 0 }}>
                                    <span>Grand Total</span>
                                    <span style={{ color: 'var(--color-primary)' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {invoiceToDelete && (
                <div className="modal-overlay" onClick={() => setInvoiceToDelete(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Trash2 size={20} /> Delete Invoice
                            </div>
                            <button onClick={() => setInvoiceToDelete(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 0', fontSize: 15, lineHeight: 1.5 }}>
                            Are you sure you want to delete invoice <strong>{invoiceToDelete.invoice_number}</strong>?
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
                                ⚠️ This action cannot be undone. The invoice and its items will be permanently removed.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setInvoiceToDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Invoice</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
