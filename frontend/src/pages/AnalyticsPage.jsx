import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, FolderKanban, Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            let url = '/reports/dashboard';
            const params = [];
            if (dateRange.start) params.push(`startDate=${dateRange.start}`);
            if (dateRange.end) params.push(`endDate=${dateRange.end}`);
            if (params.length) url += '?' + params.join('&');
            const { data } = await api.get(url);
            setData(data);
        } catch { }
        setLoading(false);
    };

    const handleFilter = () => { setLoading(true); fetchData(); };

    const exportCSV = (name, rows) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => r[k]).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div className="mobile-header"><div className="mobile-header-title">Analytics</div></div>
                <div className="page-body">
                    <div className="kpi-grid">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}</div>
                </div>
            </div>
        );
    }

    const revenueData = (data?.revenue?.monthly || data?.revenue || []).map(r => ({ name: r.month, value: r.revenue }));
    const sourceData = (data?.sources || []).map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] }));

    return (
        <div className="page-enter">
            <div className="mobile-header">
                <div className="mobile-header-title">Analytics</div>
            </div>

            <div className="page-body">
                {/* Date Filter */}
                <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input className="form-input" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={{ flex: 1, padding: 10 }} />
                        <span style={{ color: 'var(--text-muted)' }}>to</span>
                        <input className="form-input" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={{ flex: 1, padding: 10 }} />
                        <button className="btn btn-primary btn-sm" onClick={handleFilter}>Apply</button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-card-icon" style={{ background: 'rgba(16,185,129,0.12)' }}><DollarSign size={18} color="#34d399" /></div>
                        <div className="kpi-label">Avg Deal Size</div>
                        <div className="kpi-value" style={{ fontSize: 22 }}>₹{Number(data?.dealSize?.average || 0).toLocaleString()}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-card-icon" style={{ background: 'rgba(139,92,246,0.12)' }}><Users size={18} color="#a78bfa" /></div>
                        <div className="kpi-label">Conversion Rate</div>
                        <div className="kpi-value" style={{ fontSize: 22 }}>{data?.conversion?.conversion_rate || 0}%</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-card-icon" style={{ background: 'rgba(59,130,246,0.12)' }}><FolderKanban size={18} color="#60a5fa" /></div>
                        <div className="kpi-label">Active Projects</div>
                        <div className="kpi-value" style={{ fontSize: 22 }}>{data?.projects?.active || 0}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-card-icon" style={{ background: 'rgba(239,68,68,0.12)' }}><TrendingUp size={18} color="#f87171" /></div>
                        <div className="kpi-label">Outstanding</div>
                        <div className="kpi-value" style={{ fontSize: 22 }}>₹{Number(data?.outstanding?.total_outstanding || 0).toLocaleString()}</div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div className="chart-title">Revenue Trend</div>
                            <div className="chart-subtitle">Monthly performance</div>
                        </div>
                        {revenueData.length > 0 && (
                            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('revenue', revenueData)}>
                                <Download size={14} /> CSV
                            </button>
                        )}
                    </div>
                    {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={revenueData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 13 }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>
                            No revenue data available
                        </div>
                    )}
                </div>

                {/* Lead Sources Chart */}
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div className="chart-title">Lead Sources</div>
                            <div className="chart-subtitle">Distribution by origin</div>
                        </div>
                        {sourceData.length > 0 && (
                            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV('lead_sources', sourceData.map(s => ({ source: s.source, count: s.count })))}>
                                <Download size={14} /> CSV
                            </button>
                        )}
                    </div>
                    {sourceData.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <ResponsiveContainer width="50%" height={160}>
                                <PieChart>
                                    <Pie data={sourceData} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                                        {sourceData.map((s, i) => <Cell key={i} fill={s.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1 }}>
                                {sourceData.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                            <span style={{ fontSize: 13 }}>{s.source}</span>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No source data available
                        </div>
                    )}
                </div>

                {/* Conversion Stats */}
                <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                    <div className="section-title" style={{ marginBottom: 12 }}>Lead Conversion</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{data?.conversion?.total || 0}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>{data?.conversion?.won || 0}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Won</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>{data?.conversion?.lost || 0}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lost</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>{data?.conversion?.conversion_rate || 0}%</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
