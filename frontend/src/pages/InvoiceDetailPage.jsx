import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Download, Eye, Edit, Trash2, Plus, CreditCard, Calendar, FileText, Building, Hash, Clock } from 'lucide-react';

const STATUS_LABELS = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
const STATUS_COLORS = { UNPAID: '#64748b', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', CANCELLED: '#64748b' };
const METHOD_LABELS = { BANK: 'Bank Transfer', UPI: 'UPI', CASH: 'Cash', CHEQUE: 'Cheque', CARD: 'Credit Card', OTHER: 'Other' };
const METHOD_COLORS = { BANK: '#3b82f6', UPI: '#8b5cf6', CASH: '#10b981', CHEQUE: '#f59e0b', CARD: '#06b6d4', OTHER: '#64748b' };

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', method: 'BANK', notes: '', date: '' });
    const [editForm, setEditForm] = useState({ due_date: '', notes: '', items: [] });

    useEffect(() => { fetchInvoice(); }, [id]);

    const fetchInvoice = async () => {
        try {
            const { data } = await api.get(`/invoices/${id}`);
            setInvoice(data);
            setEditForm({
                due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '',
                notes: data.notes || '',
                items: data.items?.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) || []
            });
        } catch { showToast('Invoice not found', 'error'); navigate('/invoices'); }
        setLoading(false);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payments', {
                invoice_id: id,
                amount: parseFloat(payForm.amount),
                method: payForm.method,
                notes: payForm.notes || undefined,
                date: payForm.date || undefined,
            });
            showToast('Payment recorded!', 'success');
            setShowPayment(false);
            setPayForm({ amount: '', method: 'BANK', notes: '', date: '' });
            fetchInvoice();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error recording payment', 'error');
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/invoices/${id}`, {
                due_date: editForm.due_date || undefined,
                notes: editForm.notes,
                items: editForm.items.filter(i => i.description && i.unit_price > 0),
            });
            showToast('Invoice updated', 'success');
            setShowEdit(false);
            fetchInvoice();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/invoices/${id}`);
            showToast('Invoice deleted', 'success');
            navigate('/invoices');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error deleting invoice', 'error');
        }
    };

    const handleDownloadPDF = () => {
        try {
            const generatePDF = require('../utils/generateInvoicePDF').default;
            const doc = generatePDF(invoice);
            doc.save(`${invoice.invoice_number}.pdf`);
        } catch (err) { console.error(err); showToast('Failed to download', 'error'); }
    };

    const handlePreviewPDF = () => {
        try {
            const generatePDF = require('../utils/generateInvoicePDF').default;
            const doc = generatePDF(invoice);
            const blob = doc.output('blob');
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) { console.error(err); showToast('Failed to preview', 'error'); }
    };

    const addEditItem = () => setEditForm({ ...editForm, items: [...editForm.items, { description: '', quantity: 1, unit_price: 0 }] });
    const removeEditItem = (i) => setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) });
    const updateEditItem = (i, field, val) => {
        const items = [...editForm.items];
        items[i][field] = field === 'quantity' || field === 'unit_price' ? parseFloat(val) || 0 : val;
        setEditForm({ ...editForm, items });
    };

    if (loading || !invoice) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => navigate('/invoices')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Invoice</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
            </div>
        );
    }

    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
    const paidPercent = Number(invoice.total_amount) > 0 ? (Number(invoice.amount_paid) / Number(invoice.total_amount)) * 100 : 0;
    const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === 'UNPAID';
    const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;

    return (
        <div className="page-enter">
            <div className="page-header">
                <button className="page-header-back" onClick={() => navigate('/invoices')}><ArrowLeft size={20} /></button>
                <div className="page-header-title">{invoice.invoice_number}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="page-header-action" onClick={() => setShowEdit(true)} title="Edit"><Edit size={18} /></button>
                </div>
            </div>

            <div className="page-body">
                {/* Status & Amount Header */}
                <div style={{ textAlign: 'center', marginBottom: 24, padding: '24px 0' }}>
                    <span className="badge" style={{
                        background: `${STATUS_COLORS[displayStatus]}22`,
                        color: STATUS_COLORS[displayStatus],
                        fontSize: 13, padding: '6px 16px', borderRadius: 20, fontWeight: 700, marginBottom: 12, display: 'inline-block'
                    }}>
                        {STATUS_LABELS[displayStatus]}
                    </span>
                    <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8 }}>
                        ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {invoice.status !== 'PAID' && Number(invoice.amount_paid) > 0 && (
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                            ₹{Number(invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })} paid • ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} remaining
                        </div>
                    )}
                    {/* Progress Bar */}
                    {Number(invoice.total_amount) > 0 && (
                        <div style={{ marginTop: 16, maxWidth: 280, margin: '16px auto 0' }}>
                            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(paidPercent, 100)}%`,
                                    height: '100%',
                                    borderRadius: 8,
                                    background: paidPercent >= 100 ? '#10b981' : paidPercent > 0 ? '#f59e0b' : '#64748b',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
                                {paidPercent.toFixed(0)}% paid
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {invoice.status !== 'PAID' && (
                        <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            onClick={() => { setPayForm({ ...payForm, amount: String(balance.toFixed(2)) }); setShowPayment(true); }}>
                            <CreditCard size={16} /> Record Payment
                        </button>
                    )}
                    <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={handleDownloadPDF}>
                        <Download size={16} /> Download
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={handlePreviewPDF} title="Preview PDF">
                        <Eye size={16} />
                    </button>
                </div>

                {/* Invoice Info */}
                <div className="section-header"><div className="section-title">Invoice Details</div></div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                    {[
                        { icon: Hash, label: 'Invoice Number', value: invoice.invoice_number },
                        { icon: Calendar, label: 'Issued Date', value: new Date(invoice.issued_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                        { icon: Clock, label: 'Due Date', value: new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                        { icon: Building, label: 'Client', value: invoice.client?.name || '—', onClick: () => invoice.client?.id && navigate(`/clients/${invoice.client.id}`) },
                        ...(invoice.project ? [{ icon: FileText, label: 'Project', value: invoice.project?.title || '—', onClick: () => navigate(`/projects/${invoice.project.id}`) }] : []),
                    ].map((item, i, arr) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none', cursor: item.onClick ? 'pointer' : 'default' }} onClick={item.onClick}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <item.icon size={16} color="var(--text-muted)" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: 15, color: item.onClick ? 'var(--color-primary)' : 'var(--text-primary)' }}>{item.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Line Items */}
                <div className="section-header"><div className="section-title">Line Items</div></div>
                <div className="glass-card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items?.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.description}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>{item.quantity}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {(Number(invoice.tax_rate) || 0) > 0 ? (
                                    <>
                                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                                            <td colSpan={3} style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>Subtotal</td>
                                            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                                                ₹{(Number(invoice.total_amount) - Number(invoice.tax_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                                            <td colSpan={3} style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>Tax ({invoice.tax_rate}%)</td>
                                            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                                                ₹{Number(invoice.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </>
                                ) : null}
                                <tr style={{ background: 'var(--bg-tertiary)' }}>
                                    <td colSpan={3} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>Grand Total</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>
                                        ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <>
                        <div className="section-header"><div className="section-title">Notes</div></div>
                        <div className="glass-card" style={{ padding: 16, marginBottom: 24, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {invoice.notes}
                        </div>
                    </>
                )}

                {/* Payment History */}
                <div className="section-header">
                    <div className="section-title">Payment History</div>
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{invoice.payments?.length || 0}</span>
                </div>
                {(!invoice.payments || invoice.payments.length === 0) ? (
                    <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24 }}>
                        No payments recorded yet
                    </div>
                ) : (
                    <div className="card-list" style={{ marginBottom: 24 }}>
                        {invoice.payments.map(p => (
                            <div key={p.id} className="card-item">
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${METHOD_COLORS[p.method] || '#64748b'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CreditCard size={18} color={METHOD_COLORS[p.method] || '#64748b'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-success)' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {p.notes && ` • ${p.notes}`}
                                        </div>
                                    </div>
                                    <span className="badge" style={{ background: `${METHOD_COLORS[p.method]}22`, color: METHOD_COLORS[p.method], fontSize: 10 }}>
                                        {METHOD_LABELS[p.method] || p.method}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete */}
                {(!invoice.payments || invoice.payments.length === 0) && (
                    <button className="btn btn-secondary btn-block" style={{ marginTop: 16, color: 'var(--color-danger)' }} onClick={() => setShowDelete(true)}>
                        <Trash2 size={16} /> Delete Invoice
                    </button>
                )}
            </div>

            {/* Record Payment Modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Record Payment</div>
                            <button onClick={() => setShowPayment(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Balance Due</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <form onSubmit={handleRecordPayment}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Amount *</label>
                                    <input className="form-input" type="number" step="0.01" required min="0.01" max={balance}
                                        value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="₹0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Method</label>
                                    <select className="form-select" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                                        {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date</label>
                                <input className="form-input" type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <input className="form-input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Transaction ID, reference..." />
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Record ₹{payForm.amount || '0'} Payment</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Invoice Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '95vh' }}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Edit Invoice</div>
                            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input className="form-input" type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={{ resize: 'vertical' }} />
                            </div>
                            <div className="section-header">
                                <div className="section-title">Line Items</div>
                                <button className="section-action" type="button" onClick={addEditItem}>+ Add Item</button>
                            </div>
                            {editForm.items.map((item, i) => (
                                <div key={i} className="glass-card" style={{ padding: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>Item {i + 1}</span>
                                        {editForm.items.length > 1 && <button type="button" onClick={() => removeEditItem(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>}
                                    </div>
                                    <input className="form-input" placeholder="Description" value={item.description} onChange={e => updateEditItem(i, 'description', e.target.value)} style={{ marginBottom: 8 }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <input className="form-input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateEditItem(i, 'quantity', e.target.value)} />
                                        <input className="form-input" type="number" min="0" placeholder="Price" value={item.unit_price} onChange={e => updateEditItem(i, 'unit_price', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            <div className="glass-card" style={{ padding: 14, marginTop: 12, marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                                    <span>New Total</span>
                                    <span style={{ color: 'var(--color-primary)' }}>₹{editForm.items.reduce((s, i) => s + i.quantity * i.unit_price, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} type="button" onClick={() => setShowEdit(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Save Changes</button>
                            </div>
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
                                <Trash2 size={20} /> Delete Invoice
                            </div>
                            <button onClick={() => setShowDelete(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 0', fontSize: 15, lineHeight: 1.5 }}>
                            Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>?
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
                                ⚠️ This action cannot be undone. The invoice and all its line items will be permanently removed.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Invoice</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
