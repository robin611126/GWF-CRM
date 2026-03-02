import prisma from '../../config/database';

export class ReportService {
    async getMonthlyRevenue(startDate?: string, endDate?: string) {
        const where: any = {};
        if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
        if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

        const payments = await prisma.payment.findMany({
            where,
            orderBy: { date: 'asc' },
        });

        let currentMonthTotal = 0;
        let previousMonthTotal = 0;
        const monthly: Record<string, number> = {};

        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

        for (const p of payments) {
            const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = (monthly[key] || 0) + Number(p.amount);
            if (key === currentMonthStr) currentMonthTotal += Number(p.amount);
            if (key === previousMonthStr) previousMonthTotal += Number(p.amount);
        }

        let growth = 0;
        if (previousMonthTotal > 0) {
            growth = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
        } else if (currentMonthTotal > 0) {
            growth = 100;
        }

        return {
            monthly: Object.entries(monthly).map(([month, revenue]) => ({ month, revenue })),
            growth: growth.toFixed(1)
        };
    }

    async getLeadConversionRate() {
        const [total, won, lost] = await Promise.all([
            prisma.lead.count(),
            prisma.lead.count({ where: { stage: 'WON' } }),
            prisma.lead.count({ where: { stage: 'LOST' } }),
        ]);

        // Calculate growth based on rolling 30 days for better representation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const [currentMonthLeads, prevMonthLeads] = await Promise.all([
            prisma.lead.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
            prisma.lead.count({ where: { created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
        ]);

        let leadsGrowth = 0;
        if (prevMonthLeads > 0) {
            leadsGrowth = ((currentMonthLeads - prevMonthLeads) / prevMonthLeads) * 100;
        } else if (currentMonthLeads > 0) {
            leadsGrowth = 100;
        }

        return {
            total,
            won,
            lost,
            new_this_month: currentMonthLeads,
            growth: leadsGrowth.toFixed(1),
            conversion_rate: total > 0 ? ((won / total) * 100).toFixed(2) : '0.00',
            loss_rate: total > 0 ? ((lost / total) * 100).toFixed(2) : '0.00',
        };
    }

    async getLeadsBySource() {
        const sources = await prisma.lead.groupBy({
            by: ['source'],
            _count: { id: true },
        });

        return sources.map(s => ({ source: s.source, count: s._count.id }));
    }

    async getAverageDealSize() {
        const paidInvoices = await prisma.invoice.findMany({
            where: { status: 'PAID' },
            select: { total_amount: true },
        });

        if (paidInvoices.length === 0) return { average: 0, count: 0 };

        const total = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
        return {
            average: (total / paidInvoices.length).toFixed(2),
            count: paidInvoices.length,
        };
    }

    async getProjectStats() {
        const clientFilter = { client: { deleted_at: null } };
        const [active, completed, onHold, total] = await Promise.all([
            prisma.project.count({ where: { status: { in: ['PLANNING', 'DESIGN', 'DEVELOPMENT', 'REVIEW'] }, ...clientFilter } }),
            prisma.project.count({ where: { status: 'COMPLETED', ...clientFilter } }),
            prisma.project.count({ where: { status: 'ON_HOLD', ...clientFilter } }),
            prisma.project.count({ where: clientFilter }),
        ]);

        // Active projects MoM growth
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const prevActiveProjects = await prisma.project.count({
            where: {
                status: { in: ['PLANNING', 'DESIGN', 'DEVELOPMENT', 'REVIEW'] },
                created_at: { lt: firstDayCurrentMonth },
                ...clientFilter
            }
        });

        let activeGrowth = 0;
        if (prevActiveProjects > 0) {
            activeGrowth = ((active - prevActiveProjects) / prevActiveProjects) * 100;
        } else if (active > 0) {
            activeGrowth = 100;
        }

        return { active, completed, on_hold: onHold, total, active_growth: activeGrowth.toFixed(1) };
    }

    async getOutstandingInvoices() {
        const invoices = await prisma.invoice.findMany({
            where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
            select: { total_amount: true, amount_paid: true },
        });

        const totalOutstanding = invoices.reduce(
            (sum, inv) => sum + (Number(inv.total_amount) - Number(inv.amount_paid)),
            0
        );

        return {
            count: invoices.length,
            total_outstanding: totalOutstanding.toFixed(2),
        };
    }

    async getDashboardSummary(startDate?: string, endDate?: string) {
        const [revenue, conversion, sources, dealSize, projects, outstanding] = await Promise.all([
            this.getMonthlyRevenue(startDate, endDate),
            this.getLeadConversionRate(),
            this.getLeadsBySource(),
            this.getAverageDealSize(),
            this.getProjectStats(),
            this.getOutstandingInvoices(),
        ]);

        return { revenue, conversion, sources, dealSize, projects, outstanding };
    }
}

export const reportService = new ReportService();
