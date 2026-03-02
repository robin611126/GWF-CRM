import { Router, Response } from 'express';
import { clientService } from './client.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticate, authorize('clients', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await clientService.findAll({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            search: req.query.search as string,
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, authorize('clients', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const client = await clientService.findById(req.params.id);
        res.json(client);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id/credentials', authenticate, authorize('clients', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const credentials = await clientService.getDecryptedCredentials(req.params.id);
        res.json({ credentials });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/', authenticate, authorize('clients', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const client = await clientService.create(req.body);
        res.status(201).json(client);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, authorize('clients', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const client = await clientService.update(req.params.id, req.body);
        res.json(client);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, authorize('clients', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await clientService.softDelete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
