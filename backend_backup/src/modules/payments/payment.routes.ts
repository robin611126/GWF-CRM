import { Router, Response } from 'express';
import { paymentService } from './payment.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticate, authorize('payments', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await paymentService.findAll({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/invoice/:invoiceId', authenticate, authorize('payments', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const payments = await paymentService.findByInvoice(req.params.invoiceId);
        res.json(payments);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/', authenticate, authorize('payments', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const payment = await paymentService.create(req.body);
        res.status(201).json(payment);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, authorize('payments', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await paymentService.delete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
