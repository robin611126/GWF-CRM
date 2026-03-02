import { Router, Response } from 'express';
import { adminService } from './admin.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import { stringify } from 'csv-stringify/sync';

const router = Router();
const adminOnly = [authenticate, authorizeRoles('ADMIN')];

// ---- Service Plans ----
router.get('/plans', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getPlans()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/plans', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.status(201).json(await adminService.createPlan(req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.put('/plans/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.updatePlan(req.params.id, req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.delete('/plans/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.deletePlan(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

// ---- Coupons ----
router.get('/coupons', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getCoupons()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/coupons', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.status(201).json(await adminService.createCoupon(req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.put('/coupons/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.updateCoupon(req.params.id, req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.delete('/coupons/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.deleteCoupon(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

// ---- Tax Config ----
router.get('/taxes', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getTaxes()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/taxes', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.status(201).json(await adminService.createTax(req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.put('/taxes/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.updateTax(req.params.id, req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.delete('/taxes/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.deleteTax(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

// ---- Currency Config ----
router.get('/currencies', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getCurrencies()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/currencies', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.status(201).json(await adminService.createCurrency(req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.put('/currencies/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.updateCurrency(req.params.id, req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.delete('/currencies/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.deleteCurrency(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

// ---- Users ----
router.get('/users', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getUsers()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/users', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.status(201).json(await adminService.createUser(req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.put('/users/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.updateUser(req.params.id, req.body)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/users/:id/reset-password', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.resetUserPassword(req.params.id, req.body.password)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

// ---- CSV Export ----
router.get('/export/:table', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try {
        const data = await adminService.exportTable(req.params.table);
        if (data.length === 0) {
            return res.status(200).send('No data');
        }
        const csv = stringify(data, { header: true });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${req.params.table}.csv`);
        res.send(csv);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ error: e.message });
    }
});

// ---- Deleted Clients Management ----
router.get('/deleted-clients', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.getDeletedClients()); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.post('/deleted-clients/:id/restore', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.restoreClient(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});
router.delete('/deleted-clients/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
    try { res.json(await adminService.permanentlyDeleteClient(req.params.id)); } catch (e: any) { res.status(e.statusCode || 500).json({ error: e.message }); }
});

export default router;
