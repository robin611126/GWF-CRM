import { createClient } from 'npm:@insforge/sdk';

export default async function (req: Request): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    const userToken = authHeader ? authHeader.replace('Bearer ', '') : undefined;
    const client = createClient({
        baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
        edgeFunctionToken: userToken
    });

    try {
        const body = req.method === 'POST' ? await req.json() : {};
        const startDate = body.startDate || null;
        const endDate = body.endDate || null;

        // --- Monthly Revenue ---
        let paymentsQuery = client.database.from('payments').select('amount, date')
            .order('date', { ascending: true });
        if (startDate) paymentsQuery = paymentsQuery.gte('date', startDate);
        if (endDate) paymentsQuery = paymentsQuery.lte('date', endDate);
        const { data: payments } = await paymentsQuery;

        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

        let currentMonthTotal = 0, prevMonthTotal = 0;
        const monthly: Record<string, number> = {};
        for (const p of (payments || [])) {
            const d = new Date(p.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = (monthly[key] || 0) + Number(p.amount);
            if (key === currentMonthStr) currentMonthTotal += Number(p.amount);
            if (key === prevMonthStr) prevMonthTotal += Number(p.amount);
        }

        let revenueGrowth = 0;
        if (prevMonthTotal > 0) revenueGrowth = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
        else if (currentMonthTotal > 0) revenueGrowth = 100;

        const revenue = {
            monthly: Object.entries(monthly).map(([month, rev]) => ({ month, revenue: rev })),
            growth: revenueGrowth.toFixed(1)
        };

        // --- Lead Conversion ---
        const { count: totalLeads } = await client.database.from('leads').select('id', { count: 'exact', head: true });
        const { count: wonLeads } = await client.database.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'WON');
        const { count: lostLeads } = await client.database.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'LOST');

        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const { count: currentMonthLeads } = await client.database.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
        const { count: prevMonthLeads } = await client.database.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo);

        const tl = totalLeads || 0;
        const wl = wonLeads || 0;
        const ll = lostLeads || 0;
        const cml = currentMonthLeads || 0;
        const pml = prevMonthLeads || 0;

        let leadsGrowth = 0;
        if (pml > 0) leadsGrowth = ((cml - pml) / pml) * 100;
        else if (cml > 0) leadsGrowth = 100;

        const conversion = {
            total: tl, won: wl, lost: ll,
            new_this_month: cml, growth: leadsGrowth.toFixed(1),
            conversion_rate: tl > 0 ? ((wl / tl) * 100).toFixed(2) : '0.00',
            loss_rate: tl > 0 ? ((ll / tl) * 100).toFixed(2) : '0.00'
        };

        // --- Leads by Source ---
        const { data: allLeads } = await client.database.from('leads').select('source');
        const sourceMap: Record<string, number> = {};
        for (const l of (allLeads || [])) {
            sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
        }
        const sources = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

        // --- Average Deal Size ---
        const { data: paidInvoices } = await client.database.from('invoices').select('total_amount').eq('status', 'PAID');
        let dealSize = { average: '0', count: 0 };
        if (paidInvoices && paidInvoices.length > 0) {
            const total = paidInvoices.reduce((s: number, i: any) => s + Number(i.total_amount), 0);
            dealSize = { average: (total / paidInvoices.length).toFixed(2), count: paidInvoices.length };
        }

        // --- Project Stats ---
        const activeStatuses = ['PLANNING', 'DESIGN', 'DEVELOPMENT', 'REVIEW'];
        const { data: allProjects } = await client.database.from('projects').select('status, created_at');

        let active = 0, completed = 0, onHold = 0, totalProjects = 0;
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        for (const p of (allProjects || [])) {
            totalProjects++;
            if (activeStatuses.includes(p.status)) active++;
            else if (p.status === 'COMPLETED') completed++;
            else if (p.status === 'ON_HOLD') onHold++;
        }

        const prevActive = (allProjects || []).filter((p: any) =>
            activeStatuses.includes(p.status) && new Date(p.created_at) < new Date(firstDayCurrentMonth)
        ).length;

        let activeGrowth = 0;
        if (prevActive > 0) activeGrowth = ((active - prevActive) / prevActive) * 100;
        else if (active > 0) activeGrowth = 100;

        const projects = { active, completed, on_hold: onHold, total: totalProjects, active_growth: activeGrowth.toFixed(1) };

        // --- Outstanding Invoices ---
        const { data: outstandingInv } = await client.database.from('invoices')
            .select('total_amount, amount_paid')
            .in('status', ['UNPAID', 'PARTIAL', 'OVERDUE']);

        const totalOutstanding = (outstandingInv || []).reduce(
            (sum: number, inv: any) => sum + (Number(inv.total_amount) - Number(inv.amount_paid)), 0
        );

        const outstanding = { count: (outstandingInv || []).length, total_outstanding: totalOutstanding.toFixed(2) };

        return new Response(JSON.stringify({ revenue, conversion, sources, dealSize, projects, outstanding }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal server error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
