import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FolderKanban, DollarSign, Users, AlertTriangle, TrendingUp, Zap, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/dashboard').then(({ data }) => {
            setData(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header">
                    <div>
                        <div className="mobile-header-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={18} color="white" />
                            </div>
                            GWF CRM
                        </div>
                        <div className="mobile-header-subtitle">Loading...</div>
                    </div>
                </div>
                <div className="page-body">
                    <div className="kpi-grid">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
                    </div>
                </div>
            </div>
        );
    }

    const kpis = [
        {
            icon: FolderKanban,
            label: 'Active Projects',
            value: data?.projects?.active || 0,
            change: `${Number(data?.projects?.active_growth || 0) >= 0 ? '+' : ''}${data?.projects?.active_growth || 0}%`,
            positive: Number(data?.projects?.active_growth || 0) >= 0,
            bg: 'rgba(6,182,212,0.12)',
            iconColor: '#22d3ee',
        },
        {
            icon: DollarSign,
            label: 'Total Revenue',
            value: `₹${((data?.revenue?.monthly || []).reduce((s, r) => s + r.revenue, 0) / 1000).toFixed(0)}k`,
            change: `${Number(data?.revenue?.growth || 0) >= 0 ? '+' : ''}${data?.revenue?.growth || 0}%`,
            positive: Number(data?.revenue?.growth || 0) >= 0,
            bg: 'rgba(16,185,129,0.12)',
            iconColor: '#34d399',
        },
        {
            icon: Users,
            label: 'New Leads',
            value: data?.conversion?.new_this_month || 0,
            change: `${Number(data?.conversion?.growth || 0) >= 0 ? '+' : ''}${data?.conversion?.growth || 0}%`,
            positive: Number(data?.conversion?.growth || 0) >= 0,
            bg: 'rgba(139,92,246,0.12)',
            iconColor: '#a78bfa',
        },
        {
            icon: AlertTriangle,
            label: 'Outstanding',
            value: `₹${Number(data?.outstanding?.total_outstanding || 0).toLocaleString()}`,
            change: `${data?.outstanding?.count || 0} items`,
            positive: false,
            bg: 'rgba(245,158,11,0.12)',
            iconColor: '#fbbf24',
            hideTrendIcon: true,
        },
    ];

    const revenueData = (data?.revenue?.monthly || []).slice(-7).map(r => ({
        name: r.month?.split('-')[1] || '',
        value: r.revenue,
    }));

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="mobile-header">
                <div>
                    <div className="mobile-header-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="white" />
                        </div>
                        GWF CRM
                    </div>
                    <div className="mobile-header-subtitle">{user?.role?.replace('_', ' ')} Dashboard</div>
                </div>
                <div className="mobile-header-actions">
                    <div className="mobile-header-avatar">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* KPI Grid */}
                <div className="kpi-grid">
                    {kpis.map((kpi, i) => (
                        <div key={i} className="kpi-card">
                            <div className="kpi-card-row">
                                <div className="kpi-card-icon" style={{ background: kpi.bg }}>
                                    <kpi.icon size={20} color={kpi.iconColor} />
                                </div>
                                <span className={`kpi-card-change ${kpi.positive ? 'positive' : 'negative'}`}>
                                    {!kpi.hideTrendIcon && <TrendingUp size={12} />}
                                    {kpi.change}
                                </span>
                            </div>
                            <div className="kpi-label">{kpi.label}</div>
                            <div className="kpi-value">{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* Revenue Chart */}
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div className="chart-title">Revenue Trend</div>
                            <div className="chart-subtitle">Monthly performance</div>
                        </div>
                    </div>
                    {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={revenueData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 13 }}
                                    formatter={(v) => [`₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Revenue']}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text-muted)' }}>
                            No revenue data available
                        </div>
                    )}
                </div>

                {/* Project Stats */}
                <div className="section-header">
                    <div className="section-title">Project Overview</div>
                </div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active</span><div style={{ fontSize: 20, fontWeight: 700 }}>{data?.projects?.active || 0}</div></div>
                        <div><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Completed</span><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-success)' }}>{data?.projects?.completed || 0}</div></div>
                        <div><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>On Hold</span><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-warning)' }}>{data?.projects?.on_hold || 0}</div></div>
                    </div>
                    {data?.projects?.total > 0 && (
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${((data.projects.completed / data.projects.total) * 100).toFixed(0)}%` }} />
                        </div>
                    )}
                </div>

                {/* Lead Conversion */}
                <div className="section-header">
                    <div className="section-title">Lead Conversion</div>
                </div>
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Conversion Rate</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)' }}>{data?.conversion?.conversion_rate || 0}%</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Won / Total</div>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{data?.conversion?.won || 0} / {data?.conversion?.total || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Lead Sources */}
                <div className="section-header">
                    <div className="section-title">Lead Sources</div>
                </div>
                <div className="glass-card" style={{ padding: 16 }}>
                    {data?.sources?.length > 0 ? data.sources.map((s, i) => (
                        <div key={s.source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < data.sources.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                                <span style={{ fontSize: 14 }}>{s.source}</span>
                            </div>
                            <span style={{ fontWeight: 700 }}>{s.count}</span>
                        </div>
                    )) : (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No source data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
