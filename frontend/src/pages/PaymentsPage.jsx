import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Search, DollarSign, CreditCard, Plus } from 'lucide-react';

const METHOD_LABELS = { BANK: 'Bank Transfer', UPI: 'UPI', CASH: 'Cash', CHEQUE: 'Cheque', CARD: 'Credit Card', OTHER: 'Other' };
const METHOD_COLORS = { BANK: '#3b82f6', UPI: '#8b5cf6', CASH: '#10b981', CHEQUE: '#f59e0b', CARD: '#06b6d4', OTHER: '#64748b' };

export default function PaymentsPage() {
    const { showToast } = useToast();
    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ invoice_id: '', amount: '', method: 'BANK', reference: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        fetchPayments();
        // Fetch invoices that still need payment (UNPAID, PARTIAL, OVERDUE)
        api.get('/invoices?limit=100').then(({ data }) => {
            const all = data.invoices || data;
            setInvoices(all.filter(inv => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(inv.status)));
        }).catch(() => { });
    }, []);

    const fetchPayments = async () => {
        try {
            const { data } = await api.get('/payments');
            setPayments(data.payments || data);
        } catch { showToast('Error loading payments', 'error'); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payments', { ...form, amount: parseFloat(form.amount) });
            showToast('Payment recorded!', 'success');
            setShowCreate(false);
            setForm({ invoice_id: '', amount: '', method: 'BANK', reference: '', date: new Date().toISOString().split('T')[0] });
            fetchPayments();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Payments</div></div>
                <div className="page-body">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Payments</div>
                <span className="badge badge-green">{payments.length}</span>
            </div>

            <div className="page-body">
                {/* Total Card */}
                <div className="hero-card" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Total Received</div>
                    <div style={{ fontSize: 32, fontWeight: 800 }}>₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{payments.length} transactions</div>
                </div>

                {/* Payment List */}
                <div className="section-header"><div className="section-title">Payment History</div></div>
                <div className="card-list">
                    {payments.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No payments recorded</div></div>
                    ) : payments.map(p => (
                        <div key={p.id} className="card-item">
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${METHOD_COLORS[p.method] || '#64748b'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={20} color={METHOD_COLORS[p.method] || '#64748b'} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.invoice?.client?.name || p.invoice?.invoice_number || '—'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.invoice?.invoice_number} • {new Date(p.date).toLocaleDateString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-success)' }}>+₹{Number(p.amount).toLocaleString()}</div>
                                    <span className="badge" style={{ background: `${METHOD_COLORS[p.method]}22`, color: METHOD_COLORS[p.method], fontSize: 10 }}>
                                        {METHOD_LABELS[p.method] || p.method}
                                    </span>
                                </div>
                            </div>
                            {p.reference && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'monospace' }}>Ref: {p.reference}</div>}
                        </div>
                    ))}
                </div>
            </div>

            <button className="page-fab" onClick={() => setShowCreate(true)}>
                <Plus size={24} />
            </button>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Record Payment</div>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Invoice *</label>
                                <select className="form-select" required value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })}>
                                    <option value="">Select invoice...</option>
                                    {invoices.map(inv => {
                                        const bal = Number(inv.total_amount) - Number(inv.amount_paid || 0);
                                        return <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.client?.name} (₹{bal.toLocaleString('en-IN')} due)</option>;
                                    })}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input className="form-input" type="number" required min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="₹0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Method</label>
                                    <select className="form-select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                                        {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date *</label>
                                <input className="form-input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reference</label>
                                <input className="form-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Transaction ID" />
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Record Payment</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
