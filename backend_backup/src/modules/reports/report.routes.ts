import { Router, Response } from 'express';
import { reportService } from './report.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/dashboard', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getDashboardSummary(
            req.query.start_date as string,
            req.query.end_date as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/revenue', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getMonthlyRevenue(req.query.start_date as string, req.query.end_date as string);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/leads/conversion', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getLeadConversionRate();
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/leads/sources', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getLeadsBySource();
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/deals/average', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getAverageDealSize();
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/projects/stats', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getProjectStats();
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/invoices/outstanding', authenticate, authorize('reports', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await reportService.getOutstandingInvoices();
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
