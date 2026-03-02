import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, User, Clock, CheckSquare, Target, Flag, AlertTriangle, Save, X } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const PRIORITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#9f1239' };
const STATUS_COLORS = { TODO: '#64748b', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#10b981' };
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done' };
const PRIORITY_LABELS = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

export default function TaskDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', status: '', priority: '', due_date: '' });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchTask();
        api.get('/users').then(({ data }) => setUsers(data.users || data)).catch(() => { });
    }, [id]);

    const fetchTask = async () => {
        try {
            const { data } = await api.get(`/tasks/${id}`);
            const t = data.task || data;
            setTask(t);
            setEditForm({
                title: t.title || '',
                description: t.description || '',
                status: t.status || 'TODO',
                priority: t.priority || 'MEDIUM',
                due_date: t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : '',
                assigned_user_id: t.assigned_user?.id || '',
            });
        } catch {
            showToast('Task not found', 'error');
            navigate('/tasks');
        }
        setLoading(false);
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            const { data } = await api.put(`/tasks/${id}`, { status: newStatus });
            setTask(data.task || data);
            showToast('Status updated', 'success');
        } catch { showToast('Error updating status', 'error'); }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: editForm.title,
                description: editForm.description,
                status: editForm.status,
                priority: editForm.priority,
                due_date: editForm.due_date || null,
                assigned_user_id: editForm.assigned_user_id || null,
            };
            const { data } = await api.put(`/tasks/${id}`, payload);
            setTask(data.task || data);
            showToast('Task updated', 'success');
            setShowEdit(false);
            fetchTask();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating task', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/tasks/${id}`);
            showToast('Task deleted', 'success');
            navigate('/tasks');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete task', 'error');
        }
    };

    if (loading || !task) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <button className="page-header-back" onClick={() => navigate('/tasks')}><ArrowLeft size={20} /></button>
                    <div className="page-header-title">Task</div>
                    <div style={{ width: 36 }} />
                </div>
                <div className="page-body"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>
            </div>
        );
    }

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE';
    const statusColor = STATUS_COLORS[task.status] || '#64748b';
    const priorityColor = PRIORITY_COLORS[task.priority] || '#64748b';

    return (
        <div className="page-enter">
            <div className="page-header">
                <button className="page-header-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
                <div className="page-header-title">Task Details</div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="page-header-action" onClick={() => setShowEdit(true)} title="Edit"><Edit size={18} /></button>
                </div>
            </div>

            <div className="page-body">
                {/* Title & Status Hero */}
                <div style={{ textAlign: 'center', marginBottom: 24, padding: '24px 0' }}>
                    <span className="badge" style={{
                        background: `${statusColor}22`,
                        color: statusColor,
                        fontSize: 13, padding: '6px 16px', borderRadius: 20, fontWeight: 700, marginBottom: 12, display: 'inline-block'
                    }}>
                        {STATUS_LABELS[task.status]}
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, lineHeight: 1.3 }}>
                        {task.title}
                    </div>
                    {task.project && (
                        <div
                            style={{ fontSize: 14, color: 'var(--color-primary)', marginTop: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => navigate(`/projects/${task.project.id}`)}
                        >
                            <Target size={14} /> {task.project.title}
                        </div>
                    )}
                </div>

                {/* Quick Status Change */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => handleStatusUpdate(key)}
                            style={{
                                flex: 1,
                                padding: '10px 8px',
                                border: task.status === key ? `2px solid ${STATUS_COLORS[key]}` : '2px solid var(--border-color)',
                                borderRadius: 12,
                                background: task.status === key ? `${STATUS_COLORS[key]}15` : 'var(--bg-elevated)',
                                color: task.status === key ? STATUS_COLORS[key] : 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Task Info Card */}
                <div className="section-header"><div className="section-title">Task Info</div></div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                    {[
                        { icon: Flag, label: 'Priority', value: PRIORITY_LABELS[task.priority] || task.priority, color: priorityColor },
                        { icon: Calendar, label: 'Due Date', value: task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date', color: isOverdue ? '#ef4444' : undefined },
                        { icon: User, label: 'Assignee', value: task.assigned_user ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}` : 'Unassigned' },
                        ...(task.project ? [{ icon: Target, label: 'Project', value: task.project.title, onClick: () => navigate(`/projects/${task.project.id}`) }] : []),
                    ].map((item, i, arr) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none', cursor: item.onClick ? 'pointer' : 'default' }} onClick={item.onClick}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: item.color ? `${item.color}15` : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <item.icon size={16} color={item.color || 'var(--text-muted)'} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: 15, color: item.onClick ? 'var(--color-primary)' : item.color || 'var(--text-primary)', fontWeight: item.color ? 600 : 400 }}>{item.value}</div>
                            </div>
                            {isOverdue && item.label === 'Due Date' && (
                                <span className="badge" style={{ background: '#ef444422', color: '#ef4444', fontSize: 10, marginLeft: 'auto' }}>Overdue</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Description */}
                <div className="section-header"><div className="section-title">Description</div></div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24, fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                    {task.description ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{task.description}</div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No description provided</div>
                    )}
                </div>

                {/* Dependencies */}
                {(task.dependency || (task.dependents && task.dependents.length > 0)) && (
                    <>
                        <div className="section-header"><div className="section-title">Dependencies</div></div>
                        <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                            {task.dependency && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task.dependency.id}`)}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertTriangle size={16} color="var(--text-muted)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Blocked By</div>
                                        <div style={{ fontSize: 15, color: 'var(--color-primary)' }}>{task.dependency.title}</div>
                                    </div>
                                    <span className="badge" style={{ marginLeft: 'auto', background: `${STATUS_COLORS[task.dependency.status]}22`, color: STATUS_COLORS[task.dependency.status], fontSize: 10 }}>
                                        {STATUS_LABELS[task.dependency.status]}
                                    </span>
                                </div>
                            )}
                            {task.dependents?.map(dep => (
                                <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => navigate(`/tasks/${dep.id}`)}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckSquare size={16} color="var(--text-muted)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Blocks</div>
                                        <div style={{ fontSize: 15, color: 'var(--color-primary)' }}>{dep.title}</div>
                                    </div>
                                    <span className="badge" style={{ marginLeft: 'auto', background: `${STATUS_COLORS[dep.status]}22`, color: STATUS_COLORS[dep.status], fontSize: 10 }}>
                                        {STATUS_LABELS[dep.status]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Delete Button */}
                <button
                    className="btn btn-secondary btn-block"
                    style={{ marginTop: 16, color: 'var(--color-danger)' }}
                    onClick={() => setShowDelete(true)}
                >
                    <Trash2 size={16} /> Delete Task
                </button>
            </div>

            {/* Edit Task Modal */}
            {showEdit && (
                <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '95vh' }}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">Edit Task</div>
                            <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={4} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assignee</label>
                                    <select className="form-select" value={editForm.assigned_user_id} onChange={e => setEditForm({ ...editForm, assigned_user_id: e.target.value })}>
                                        <option value="">Unassigned</option>
                                        {users.filter(u => u.is_active).map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} type="button" onClick={() => setShowEdit(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} type="submit">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDelete && (
                <div className="modal-overlay" onClick={() => setShowDelete(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Trash2 size={20} /> Delete Task
                            </div>
                            <button onClick={() => setShowDelete(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ padding: '20px 0', fontSize: 15, lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>"{task.title}"</strong>?
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
                                ⚠️ This action cannot be undone. The task will be permanently removed.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
