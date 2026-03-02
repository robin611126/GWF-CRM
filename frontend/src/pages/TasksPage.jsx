import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Search, Check, Clock, AlertTriangle, LayoutGrid, List, Trash2, Plus, CheckCircle } from 'lucide-react';
import SwipeableItem from '../components/SwipeableItem';
import PullToRefresh from '../components/PullToRefresh';

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done' };
const STATUS_COLORS = { TODO: '#64748b', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#10b981' };
const PRIORITY_COLORS = { LOW: '#64748b', MEDIUM: '#f59e0b', HIGH: '#ef4444' };

export default function TasksPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [viewMode, setViewMode] = useState('table');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', project_id: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchTasks = () => {
        api.get('/tasks').then(({ data }) => {
            setTasks(data.tasks || data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const fetchProjects = () => {
        api.get('/projects').then(({ data }) => {
            setProjects(data.projects || data);
        }).catch(console.error);
    };

    useEffect(() => {
        fetchTasks();
        fetchProjects();
    }, []);

    const statuses = ['ALL', ...Object.keys(STATUS_LABELS)];
    const filteredTasks = tasks.filter(t => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (!search) return true;
        return t.title.toLowerCase().includes(search.toLowerCase());
    });

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            showToast('Task updated', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error updating task', 'error');
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/tasks', taskForm);
            showToast('Task created successfully!', 'success');
            setShowAddTask(false);
            setTaskForm({ title: '', description: '', priority: 'MEDIUM', project_id: '' });
            fetchTasks();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error adding task', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId, taskTitle) => {
        if (!window.confirm(`Delete task "${taskTitle}"?`)) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            showToast('Task deleted', 'success');
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (err) {
            showToast(err.response?.data?.error || 'Error deleting task', 'error');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filteredTasks.map(t => t.id));
        else setSelectedIds([]);
    };

    const handleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} tasks?`)) return;
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/tasks/${id}`)));
            showToast('Tasks deleted', 'success');
            setSelectedIds([]);
            fetchTasks();
        } catch (err) {
            showToast('Error deleting tasks', 'error');
        }
    };

    const handleBulkStage = async (e) => {
        const status = e.target.value;
        if (!status) return;
        try {
            await Promise.all(selectedIds.map(id => api.put(`/tasks/${id}`, { status })));
            showToast('Tasks updated', 'success');
            setSelectedIds([]);
            fetchTasks();
        } catch (err) {
            showToast('Error updating tasks', 'error');
        }
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Tasks</div></div>
                <div className="page-body">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 12 }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Tasks</div>
                <div className="mobile-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => setShowAddTask(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={16} /> New Task
                    </button>
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

            <PullToRefresh onRefresh={fetchTasks}>
                <div className="page-body">
                    <div className="search-bar">
                        <Search size={18} color="var(--text-muted)" />
                        <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <div className="filter-tabs">
                        {statuses.map(s => (
                            <button key={s} className={`filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                                {s === 'ALL' ? 'All' : STATUS_LABELS[s]}
                                <span className="filter-tab-count">{s === 'ALL' ? tasks.length : tasks.filter(t => t.status === s).length}</span>
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
                            <button className="btn btn-danger" style={{ padding: '6px 12px', minHeight: 'unset', display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleBulkDelete}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    )}

                    {viewMode === 'cards' ? (
                        <div className="card-list">
                            {filteredTasks.length === 0 ? (
                                <div className="empty-state"><div className="empty-state-text">No tasks found</div></div>
                            ) : filteredTasks.map(task => {
                                const leftActions = task.status !== 'DONE' ? [
                                    { label: 'Complete', icon: <CheckCircle size={16} />, color: '#10b981', onClick: () => handleStatusUpdate(task.id, 'DONE') }
                                ] : null;

                                const rightActions = [
                                    { label: 'Delete', icon: <Trash2 size={16} />, color: '#ef4444', onClick: () => handleDeleteTask(task.id, task.title) }
                                ];

                                return (
                                    <SwipeableItem key={task.id} leftActions={leftActions} rightActions={rightActions}>
                                        <div
                                            className="card-item"
                                            style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority] || '#64748b'}`, borderRadius: 0, borderTop: 'none', borderRight: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                            onClick={() => navigate(`/tasks/${task.id}`)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{task.title}</div>
                                                    {task.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{task.description}</div>}
                                                    {task.project && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.project.title}</div>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <select
                                                        className="form-select"
                                                        style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: 12, borderRadius: 8 }}
                                                        value={task.status}
                                                        onChange={e => handleStatusUpdate(task.id, e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                                                <span className="badge" style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority], fontSize: 10 }}>
                                                    {task.priority}
                                                </span>
                                                {task.due_date && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                                        <Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {task.assigned_user && (
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        → {task.assigned_user.first_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </SwipeableItem>
                                )
                            })}
                        </div>
                    ) : (
                        /* Table View */
                        <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', width: 40 }}>
                                            <input type="checkbox" checked={selectedIds.length === filteredTasks.length && filteredTasks.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                                        </th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Project</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Priority</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Assignee</th>
                                        <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', width: 60 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.map(task => (
                                        <tr
                                            key={task.id}
                                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            onClick={() => navigate(`/tasks/${task.id}`)}
                                        >
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => handleSelect(task.id)} style={{ cursor: 'pointer' }} />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{task.project?.title || '-'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <select
                                                    className="form-select"
                                                    style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 12, borderRadius: 6, minHeight: 'unset' }}
                                                    value={task.status}
                                                    onChange={e => handleStatusUpdate(task.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="badge" style={{ background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority], fontSize: 10 }}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                                {task.assigned_user ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}` : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDeleteTask(task.id, task.title)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                                                    title="Delete task"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No tasks found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </PullToRefresh>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <div className="modal-header">
                            <div className="modal-title">New Task</div>
                            <button onClick={() => setShowAddTask(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>
                        <form onSubmit={handleAddTask}>
                            <div className="form-group">
                                <label className="form-label">Project *</label>
                                <select className="form-select" required value={taskForm.project_id} onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}>
                                    <option value="" disabled>Select Project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Task description..." style={{ resize: 'vertical' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
