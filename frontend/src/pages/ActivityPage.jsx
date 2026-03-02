import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import PullToRefresh from '../components/PullToRefresh';
import { Activity, User, Briefcase, FileText, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';

export default function ActivityPage() {
    const { showToast } = useToast();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = useCallback(async () => {
        try {
            const { data } = await api.get('/activity');
            setActivities(data.activities);
        } catch (error) {
            showToast('Error loading activity feed', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    // Group activities by date
    const groupedActivities = useMemo(() => {
        const groups = {};
        activities.forEach(activity => {
            const date = new Date(activity.changed_at);
            let label = format(date, 'MMM d, yyyy');
            if (isToday(date)) label = 'Today';
            else if (isYesterday(date)) label = 'Yesterday';

            if (!groups[label]) groups[label] = [];
            groups[label].push(activity);
        });
        return Object.entries(groups);
    }, [activities]);

    const getIconForEntity = (entityType) => {
        switch (entityType) {
            case 'Lead': return <User size={18} color="var(--color-primary)" />;
            case 'Project': return <Briefcase size={18} color="var(--color-accent)" />;
            case 'Task': return <CheckCircle size={18} color="var(--color-success)" />;
            case 'Invoice': return <FileText size={18} color="var(--color-warning)" />;
            case 'Client': return <User size={18} color="var(--color-info)" />;
            default: return <Activity size={18} color="var(--text-muted)" />;
        }
    };

    const getIconBackground = (entityType) => {
        switch (entityType) {
            case 'Lead': return 'rgba(59, 130, 246, 0.12)';
            case 'Project': return 'rgba(139, 92, 246, 0.12)';
            case 'Task': return 'rgba(16, 185, 129, 0.12)';
            case 'Invoice': return 'rgba(245, 158, 11, 0.12)';
            case 'Client': return 'rgba(6, 182, 212, 0.12)';
            default: return 'var(--bg-tertiary)';
        }
    };

    const formatActionText = (activity) => {
        const actor = activity.changed_by_user
            ? `${activity.changed_by_user.first_name} ${activity.changed_by_user.last_name}`
            : 'System';

        return (
            <span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{actor}</span>
                <span style={{ color: 'var(--text-secondary)' }}> {activity.field.toLowerCase()} </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activity.new_value || activity.entity_type}</span>
            </span>
        );
    };

    return (
        <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            {/* Mobile Header */}
            <div className="mobile-header" style={{ borderBottom: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div className="mobile-header-title">Activity Feed</div>
                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <Activity size={18} color="var(--color-primary)" />
                </div>
            </div>

            {/* Desktop Header area */}
            <div className="hidden lg:flex" style={{ padding: '40px 48px 24px', background: 'var(--bg-primary)', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
                    <Activity size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>Activity Feed</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, marginTop: 4 }}>Systemic changes and team progress across the CRM.</p>
                </div>
            </div>

            <PullToRefresh onRefresh={fetchActivity}>
                <div className="page-body" style={{ paddingBottom: 80, paddingLeft: 'max(20px, env(safe-area-inset-left))', paddingRight: 'max(20px, env(safe-area-inset-right))' }}>

                    <div className="timeline-wrapper lg:mt-4" style={{
                        maxWidth: 900,
                        margin: '0 auto',
                        width: '100%',
                    }}>
                        {loading ? (
                            <div style={{ padding: 32 }}>
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 16 }} />)}
                            </div>
                        ) : activities.length === 0 ? (
                            <div className="empty-state" style={{ padding: '80px 20px' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                    <Activity size={40} color="var(--text-muted)" />
                                </div>
                                <div className="empty-state-text" style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 700 }}>No recent activity</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12, maxWidth: 300, textAlign: 'center' }}>When your team makes updates, they'll show up here chronologically.</div>
                            </div>
                        ) : (
                            <div className="timeline-container" style={{ position: 'relative', padding: '16px 20px' }} className="lg:p-8">
                                {/* Thin Gradient Timeline Line down the left */}
                                <div style={{
                                    position: 'absolute',
                                    left: 'max(43px, 52px)',
                                    top: 40,
                                    bottom: 0,
                                    width: 1,
                                    background: 'linear-gradient(to bottom, var(--color-primary), transparent)',
                                    opacity: 0.3,
                                    zIndex: 0
                                }} className="timeline-line-bg" />

                                {groupedActivities.map(([dateLabel, groupActivities], groupIndex) => (
                                    <div key={dateLabel} style={{ marginBottom: 40 }}>
                                        {/* Sticky Date Pill overlay */}
                                        <div style={{
                                            position: 'sticky',
                                            top: -1,
                                            zIndex: 10,
                                            padding: '8px 0 24px 0',
                                            background: 'linear-gradient(to bottom, var(--bg-primary) 70%, transparent)',
                                            marginBottom: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}>
                                            <div style={{
                                                fontSize: 12,
                                                fontWeight: 800,
                                                color: 'var(--color-primary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: 1.5,
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-color)',
                                                padding: '6px 16px',
                                                borderRadius: 24,
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                            }} className="glass-panel">
                                                {dateLabel}
                                            </div>
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            {groupActivities.map((activity, index) => {
                                                // Dynamic shadow colors for icons like the Stitch design
                                                let shadowColor = 'rgba(140, 31, 249, 0.15)';
                                                if (activity.entity_type === 'Task') shadowColor = 'rgba(16, 185, 129, 0.15)';
                                                if (activity.entity_type === 'Lead') shadowColor = 'rgba(59, 130, 246, 0.15)';
                                                if (activity.entity_type === 'Invoice') shadowColor = 'rgba(245, 158, 11, 0.15)';

                                                return (
                                                    <div key={activity.id} className="group hover:-translate-y-[2px]" style={{ display: 'flex', gap: 24, paddingBottom: 24, position: 'relative', zIndex: 1, transition: 'all 0.2s ease' }}>
                                                        {/* Glowing Glass Icon Container */}
                                                        <div style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: '50%',
                                                            background: 'var(--bg-elevated)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            border: '1px solid var(--border-color)',
                                                            boxShadow: `0 0 20px ${shadowColor}`,
                                                            position: 'relative',
                                                            transition: 'inherit'
                                                        }} className="group-hover:shadow-xl">
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                background: getIconBackground(activity.entity_type),
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                {getIconForEntity(activity.entity_type)}
                                                            </div>
                                                        </div>

                                                        {/* Glassmorphic Activity Card */}
                                                        <div style={{
                                                            flex: 1,
                                                            background: 'var(--bg-elevated)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: 16,
                                                            padding: 20,
                                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
                                                            transition: 'inherit'
                                                        }} className="hover:shadow-md hover:border-primary/30 glass-panel">
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }} className="sm:flex-row sm:items-center">
                                                                <div style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                                                    {formatActionText(activity)}
                                                                </div>
                                                                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                    {formatDistanceToNow(new Date(activity.changed_at), { addSuffix: true })}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, mt: 16 }}>
                                                                <span style={{ padding: '2px 8px', background: getIconBackground(activity.entity_type), color: 'var(--text-primary)', fontSize: 11, fontWeight: 700, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                    {activity.entity_type}
                                                                </span>
                                                                <span style={{ padding: '2px 8px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                    {(activity.action || activity.field || 'Update').replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PullToRefresh>
        </div>
    );
}
