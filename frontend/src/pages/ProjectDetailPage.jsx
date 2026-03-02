import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, MoreVertical, Plus, Check, Trash2, Clock, Edit, LayoutList, LayoutDashboard, FileText, DollarSign } from 'lucide-react';

const STATUS_LABELS = { PLANNING: 'Planning', DESIGN: 'Design', DEVELOPMENT: 'Development', REVIEW: 'Review', COMPLETED: 'Completed', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled' };
const STATUS_COLORS = { PLANNING: '#8b5cf6', DESIGN: '#f59e0b', DEVELOPMENT: '#3b82f6', REVIEW: '#06b6d4', COMPLETED: '#10b981', ON_HOLD: '#f59e0b', CANCELLED: '#ef4444' };
const PRIORITY_COLORS = { LOW: '#64748b', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const TASK_STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done' };
const TASK_STATUS_COLORS = { TODO: '#64748b', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#10b981' };

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [taskView, setTaskView] = useState('list'); // 'list' or 'board'
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddChecklist, setShowAddChecklist] = useState(false);
    const [showEditStatus, setShowEditStatus] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM' });
    const [checklistItem, setChecklistItem] = useState('');
    const [showEditProject, setShowEditProject] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [projectInvoices, setProjectInvoices] = useState([]);

    useEffect(() => {
        fetchProject();
        api.get('/clients?limit=100').then(({ data }) => setClients(data.clients || data)).catch(() => { });
        api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => { });
        api.get(`/invoices?client_id=&limit=100`).then(({ data }) => {
            const all = data.invoices || data;
            setProjectInvoices(all.filter(inv => inv.project_id === id));
        }).catch(() => { });
    }, [id]);

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
        } catch { showToast('Project not found', 'error'); navigate('/projects'); }
        setLoading(false);
    };

    const getProgress = () => {
        if (!project?.checklist?.length) return 0;
        return Math.round((project.checklist.filter(c => c.is_completed).length / project.checklist.length) * 100);
    };

    const toggleChecklist = async (itemId) => {
        try {
            await api.put(`/projects/checklist/${itemId}/toggle`);
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const addChecklistItem = async () => {
        if (!checklistItem.trim()) return;
        try {
            await api.post(`/projects/${id}/checklist`, { label: checklistItem });
            setChecklistItem('');
            setShowAddChecklist(false);
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const deleteChecklistItem = async (itemId) => {
        try {
            await api.delete(`/projects/checklist/${itemId}`);
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const addTask = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...taskForm,
                project_id: id,
                assigned_user_id: taskForm.assigned_user_id || undefined
            };
            await api.post('/tasks', payload);
            showToast('Task added!', 'success');
            setShowAddTask(false);
            setTaskForm({ title: '', description: '', priority: 'MEDIUM', assigned_user_id: '' });
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating task', 'error');
        }
    }

    const updateStatus = async (status) => {
        try {
            await api.put(`/projects/${id}`, { status });
            showToast('Status updated', 'success');
            setShowEditStatus(false);
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editForm,
                budget: editForm.budget ? parseFloat(editForm.budget) : undefined,
                start_date: editForm.start_date ? new Date(editForm.start_date).toISOString() : undefined,
                end_date: editForm.end_date ? new Date(editForm.end_date).toISOString() : undefined,
            };
            await api.put(`/projects/${id}`, payload);
            showToast('Project updated!', 'success');
            setShowEditProject(false);
            fetchProject();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error', 'error');
        }
    };

    if (loading || !project) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => navigate('/projects')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Project Details</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
            </div>
        );
    }

    const progress = getProgress();
    const doneCount = project.checklist?.filter(c => c.is_completed).length || 0;
    const totalCount = project.checklist?.length || 0;

    // Overview variables
    const completedTasks = project.tasks?.filter(t => t.status === 'DONE').length || 0;
    const totalTasks = project.tasks?.length || 0;
    const taskProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const timeSpentDays = project.created_at ? Math.max(0, Math.floor((new Date() - new Date(project.created_at)) / (1000 * 60 * 60 * 24))) : 0;
    const daysRemaining = project.end_date ? Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    return (
        <div className="page-enter">
            <div className="page-header">
                <button className="page-header-back" onClick={() => navigate('/projects')}><ArrowLeft size={20} /></button>
                <div className="page-header-title">Project Details</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="page-header-action" onClick={() => {
                        setEditForm({
                            title: project.title,
                            client_id: project.client_id,
                            description: project.description || '',
                            budget: project.budget || '',
                            start_date: project.start_date ? new Date(project.start_date).toISOString().substring(0, 10) : '',
                            end_date: project.end_date ? new Date(project.end_date).toISOString().substring(0, 10) : '',
                        });
                        setShowEditProject(true);
                    }}><Edit size={18} /></button>
                    <button className="page-header-action" onClick={() => setShowEditStatus(true)}><MoreVertical size={18} /></button>
                </div>
            </div>

            <div className="page-body">
                {/* Project Header */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="badge" style={{ background: `${STATUS_COLORS[project.status]}22`, color: STATUS_COLORS[project.status] }}>
                            {STATUS_LABELS[project.status]}
                        </span>
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{project.title}</h2>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        {project.client?.name || '—'}
                        {project.start_date && ` • Started ${new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {project.end_date && ` • Due ${new Date(project.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {!project.end_date && ' • No deadline'}
                    </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Progress</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Tabs */}
                <div className="tab-bar">
                    <button className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={`tab-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</button>
                    <button className={`tab-item ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>Files</button>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {/* High-level KPIs */}
                        <div className="kpi-grid">
                            <div className="glass-card" style={{ padding: 16 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Overall Progress</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {/* Circular Progress (SVG) */}
                                    <div style={{ position: 'relative', width: 64, height: 64 }}>
                                        <svg width="64" height="64" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none" stroke="var(--bg-tertiary)" strokeWidth="3"
                                            />
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none" stroke="var(--color-primary)" strokeWidth="3"
                                                strokeDasharray={`${progress}, 100`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 13 }}>
                                            {progress}%
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>Milestones</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doneCount} of {totalCount} completed</div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: 16 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Task Completion</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)', marginBottom: 4 }}>{taskProgress}%</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{completedTasks} of {totalTasks} tasks done</div>
                            </div>

                            {/* Financial Summary */}
                            <div className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--color-warning)' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <DollarSign size={14} /> Financials
                                    </div>
                                    {projectInvoices.length > 0 && (
                                        <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 6px' }}>{projectInvoices.length} Invoices</span>
                                    )}
                                </div>
                                {(() => {
                                    const budget = Number(project.budget || 0);
                                    const invoiced = projectInvoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
                                    const paid = projectInvoices.reduce((s, inv) => s + Number(inv.amount_paid || 0), 0);
                                    const outstanding = invoiced - paid;
                                    const invoicedPct = budget > 0 ? Math.min((invoiced / budget) * 100, 100) : 0;
                                    return (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                                <div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget</div>
                                                    <div style={{ fontSize: 16, fontWeight: 800 }}>{budget > 0 ? `₹${budget.toLocaleString('en-IN')}` : '—'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invoiced</div>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: invoiced > 0 ? 'var(--color-primary)' : 'inherit' }}>₹{invoiced.toLocaleString('en-IN')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Paid</div>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>₹{paid.toLocaleString('en-IN')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outstanding</div>
                                                    <div style={{ fontSize: 16, fontWeight: 800, color: outstanding > 0 ? '#ef4444' : '#10b981' }}>₹{outstanding.toLocaleString('en-IN')}</div>
                                                </div>
                                            </div>
                                            {projectInvoices.length > 0 && invoiced > 0 && (
                                                <div style={{ marginTop: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                        <span>Invoices Paid Progress</span>
                                                        <span style={{ fontWeight: 600 }}>{((paid / invoiced) * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 4, height: 8, overflow: 'hidden', display: 'flex' }}>
                                                        {projectInvoices.map((inv, idx) => {
                                                            const invTotal = Number(inv.total_amount || 0);
                                                            const invPaid = Number(inv.amount_paid || 0);
                                                            if (invTotal === 0 || invPaid === 0) return null;

                                                            const percentageOfTotalInvoiced = (invPaid / invoiced) * 100;
                                                            const paidPct = invTotal > 0 ? (invPaid / invTotal) * 100 : 0;
                                                            const color = paidPct >= 100 ? '#10b981' : '#f59e0b';

                                                            return (
                                                                <div
                                                                    key={inv.id}
                                                                    title={`${inv.invoice_number}: ₹${invPaid.toLocaleString('en-IN')} paid`}
                                                                    style={{
                                                                        width: `${percentageOfTotalInvoiced}%`,
                                                                        height: '100%',
                                                                        background: color,
                                                                        transition: 'width 0.5s ease',
                                                                        borderRight: idx < projectInvoices.length - 1 ? '1px solid var(--bg-primary)' : 'none'
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Invoices Breakdown */}
                                            {projectInvoices.length > 0 && (
                                                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>Invoice Breakdown</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate('/invoices', { state: { openCreate: true, prefillClient: project.client_id, prefillProject: project.id } }); }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                                                        >
                                                            <Plus size={12} /> New Invoice
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {projectInvoices.map((inv) => {
                                                            const total = Number(inv.total_amount || 0);
                                                            const paidAmt = Number(inv.amount_paid || 0);
                                                            const paidPct = total > 0 ? (paidAmt / total) * 100 : 0;
                                                            return (
                                                                <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer', padding: 8, borderRadius: 8, background: 'var(--bg-tertiary)', transition: 'background 0.2s' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoice_number}</span>
                                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                            {paidAmt > 0 && paidAmt < total && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>PARTIAL</span>}
                                                                            {paidAmt >= total && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>PAID</span>}
                                                                            {paidAmt === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>UNPAID</span>}
                                                                            <span style={{ fontWeight: 700 }}>₹{paidAmt.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                                                                        <div style={{ width: `${Math.min(paidPct, 100)}%`, height: '100%', borderRadius: 4, background: paidPct >= 100 ? '#10b981' : paidPct > 0 ? '#f59e0b' : 'transparent', transition: 'width 0.5s ease' }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="glass-card" style={{ padding: 16, borderLeft: `3px solid ${daysRemaining === null ? 'var(--color-info)' : daysRemaining > 0 ? 'var(--color-info)' : 'var(--color-danger)'}` }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Timeline</div>
                                {project.end_date ? (
                                    <>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: daysRemaining < 0 ? 'var(--color-danger)' : daysRemaining <= 7 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} Days Overdue` : `${daysRemaining} Days Left`}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                            {project.start_date && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Start Date</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            )}
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Deadline</span>
                                                <span style={{ fontWeight: 600, color: daysRemaining < 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>{new Date(project.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>No deadline set</div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity or Notes Could Go Here */}
                        <div className="glass-card" style={{ padding: 16, marginTop: 12 }}>
                            <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Project Details</div>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                {project.description || 'No description provided.'}
                            </p>
                            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                                <span>Time Spent: {timeSpentDays} days</span>
                            </div>
                        </div>

                        {/* Move Checklist Here */}
                        <div className="section-header" style={{ marginTop: 24 }}>
                            <div className="section-title">Milestones</div>
                            <span className="badge badge-blue">{doneCount}/{totalCount} Done</span>
                        </div>

                        {project.checklist?.map(item => (
                            <div key={item.id} className="checklist-item" onClick={() => toggleChecklist(item.id)}>
                                <div className={`checklist-checkbox ${item.is_completed ? 'checked' : ''}`}>
                                    {item.is_completed && <Check size={14} color="white" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className={`checklist-label ${item.is_completed ? 'completed' : ''}`}>{item.label}</div>
                                    <div className="checklist-meta">
                                        {item.is_completed ? `Completed` : item.due_date ? `Due ${new Date(item.due_date).toLocaleDateString()}` : ''}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); deleteChecklistItem(item.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        {showAddChecklist ? (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                <input className="form-input" placeholder="Milestone title..." value={checklistItem} onChange={e => setChecklistItem(e.target.value)} autoFocus style={{ flex: 1 }} />
                                <button className="btn btn-primary btn-sm" onClick={addChecklistItem}>Add</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddChecklist(false)}>✕</button>
                            </div>
                        ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddChecklist(true)} style={{ marginBottom: 24 }}>
                                <Plus size={14} /> Add Milestone
                            </button>
                        )}
                    </div>
                )}



                {/* Tasks */}
                {activeTab === 'tasks' && (
                    <>
                        <div className="section-header" style={{ marginTop: 8 }}>
                            <div className="section-title">Tasks</div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 8, padding: 2 }}>
                                    <button onClick={() => setTaskView('list')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: taskView === 'list' ? 'var(--bg-secondary)' : 'transparent', color: taskView === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: taskView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                        <LayoutList size={16} />
                                    </button>
                                    <button onClick={() => setTaskView('board')} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: taskView === 'board' ? 'var(--bg-secondary)' : 'transparent', color: taskView === 'board' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: taskView === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                        <LayoutDashboard size={16} />
                                    </button>
                                </div>
                                <button className="section-action" onClick={() => setShowAddTask(true)}>+ New Task</button>
                            </div>
                        </div>

                        {taskView === 'list' ? (
                            <div className="card-list">
                                {project.tasks?.length > 0 ? project.tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="card-item"
                                        style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority] || '#64748b'}`, cursor: 'pointer' }}
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, paddingRight: 12 }}>
                                                <div style={{ fontWeight: 600, fontSize: 15 }}>{task.title}</div>
                                                {task.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{task.description}</div>}
                                            </div>
                                            {task.assigned_user && (
                                                <div title={`${task.assigned_user.first_name} ${task.assigned_user.last_name}`} style={{
                                                    width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold'
                                                }}>
                                                    {task.assigned_user.first_name[0]}{task.assigned_user.last_name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                                            <span className="badge" style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority], fontSize: 10 }}>{task.priority}</span>
                                            <select
                                                value={task.status}
                                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    background: `${TASK_STATUS_COLORS[task.status]}22`,
                                                    color: TASK_STATUS_COLORS[task.status],
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    border: 'none',
                                                    borderRadius: 20,
                                                    padding: '4px 8px',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                {Object.entries(TASK_STATUS_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val} style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {task.due_date && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                                <Clock size={12} /> Due {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="empty-state" style={{ padding: 40, border: '1px dashed var(--border-color)', borderRadius: 16 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--text-muted)' }}>
                                            <Check size={24} />
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No tasks yet</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Create the first task to get started</div>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTask(true)}>+ New Task</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="kanban-board" style={{ paddingBottom: 20 }}>
                                {Object.entries(TASK_STATUS_LABELS).map(([statusKey, statusLabel]) => {
                                    const columnTasks = (project.tasks || []).filter(t => t.status === statusKey);
                                    return (
                                        <div key={statusKey} className="kanban-column" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div className="kanban-column-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: TASK_STATUS_COLORS[statusKey] }} />
                                                    {statusLabel}
                                                </div>
                                                <div className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{columnTasks.length}</div>
                                            </div>
                                            <div className="kanban-card-list">
                                                {columnTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className="kanban-card"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                                    >
                                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                                                        {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                <span className="badge" style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority], fontSize: 10, alignSelf: 'flex-start' }}>{task.priority}</span>
                                                                {task.due_date && <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {new Date(task.due_date).toLocaleDateString()}</div>}
                                                            </div>
                                                            {task.assigned_user && (
                                                                <div title={`${task.assigned_user.first_name} ${task.assigned_user.last_name}`} style={{
                                                                    width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold'
                                                                }}>
                                                                    {task.assigned_user.first_name[0]}{task.assigned_user.last_name[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ marginTop: 8 }}>
                                                            <select
                                                                value={task.status}
                                                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'var(--bg-secondary)',
                                                                    color: 'var(--text-secondary)',
                                                                    fontSize: 11,
                                                                    border: '1px solid var(--border-color)',
                                                                    borderRadius: 6,
                                                                    padding: '4px 8px',
                                                                    outline: 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {Object.entries(TASK_STATUS_LABELS).map(([val, label]) => (
                                                                    <option key={val} value={val}>{label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                                {columnTasks.length === 0 && (
                                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '2px dashed var(--border-color)', borderRadius: 12 }}>
                                                        Drop tasks here
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                    <>
                        <div className="section-header" style={{ marginTop: 8 }}>
                            <div className="section-title">Project Files</div>
                            <label className="section-action" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={16} /> Upload File
                                <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                        await api.post(`/projects/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        showToast('File uploaded', 'success');
                                        fetchProject();
                                    } catch (err) {
                                        showToast(err.response?.data?.error || 'Error uploading file', 'error');
                                    }
                                    e.target.value = null;
                                }} />
                            </label>
                        </div>
                        {project.files?.length > 0 ? project.files.map(f => (
                            <div key={f.id} className="glass-card" style={{ padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📁</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{f.filename}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.mimetype || 'File'} • {(f.size / 1024).toFixed(0)} KB</div>
                                </div>
                                <button onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm('Delete this file?')) return;
                                    try {
                                        await api.delete(`/projects/files/${f.id}`);
                                        fetchProject();
                                    } catch (err) { showToast('Error', 'error'); }
                                }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )) : (
                            <div className="empty-state" style={{ padding: 40, border: '1px dashed var(--border-color)', borderRadius: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20 }}>
                                    📁
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No files uploaded</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upload documents or assets related to this project</div>
                            </div>
                        )}
                    </>
                )}


            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">New Task</div>
                            <button onClick={() => setShowAddTask(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={addTask}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assignee</label>
                                <select className="form-select" value={taskForm.assigned_user_id || ''} onChange={e => setTaskForm({ ...taskForm, assigned_user_id: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                </select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Add Task</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Status Modal */}
            {showEditStatus && (
                <div className="modal-overlay" onClick={() => setShowEditStatus(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-handle" />
                        <div className="modal-title" style={{ marginBottom: 16 }}>Change Status</div>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <div
                                key={key}
                                className="quick-create-item"
                                style={{ background: project.status === key ? 'var(--bg-tertiary)' : 'transparent' }}
                                onClick={() => updateStatus(key)}
                            >
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[key] }} />
                                <span style={{ fontWeight: 600 }}>{label}</span>
                                {project.status === key && <Check size={16} color="var(--color-primary)" style={{ marginLeft: 'auto' }} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditProject && (
                <div className="modal-overlay" onClick={() => setShowEditProject(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Edit Project</div>
                            <button onClick={() => setShowEditProject(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleUpdateProject}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Project title" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select className="form-select" required value={editForm.client_id || ''} onChange={e => setEditForm({ ...editForm, client_id: e.target.value })}>
                                    <option value="">Select a client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={3} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Project description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Budget (₹)</label>
                                    <input className="form-input" type="number" value={editForm.budget || ''} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Deadline</label>
                                    <input className="form-input" type="date" value={editForm.end_date || ''} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
