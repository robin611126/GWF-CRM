import { Router, Response } from 'express';
import { leadService } from './lead.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLeadSchema, updateLeadSchema, listLeadsSchema } from './lead.schema';

const router = Router();

// GET /api/leads — List with filters
router.get('/', authenticate, authorize('leads', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await leadService.findAll({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            stage: req.query.stage as string,
            source: req.query.source as string,
            assigned_user_id: req.query.assigned_user_id as string,
            search: req.query.search as string,
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// GET /api/leads/kanban — Kanban pipeline data
router.get('/kanban', authenticate, authorize('leads', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const pipeline = await leadService.getKanbanData();
        res.json(pipeline);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// GET /api/leads/check-duplicate?email=...
router.get('/check-duplicate', authenticate, authorize('leads', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const email = req.query.email as string;
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const result = await leadService.checkDuplicate(email);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// GET /api/leads/:id
router.get('/:id', authenticate, authorize('leads', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const lead = await leadService.findById(req.params.id);
        res.json(lead);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// POST /api/leads
router.post('/', authenticate, authorize('leads', 'write'), validate(createLeadSchema), async (req: AuthRequest, res: Response) => {
    try {
        const lead = await leadService.create(req.body);
        res.status(201).json(lead);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// PUT /api/leads/:id
router.put('/:id', authenticate, authorize('leads', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const lead = await leadService.update(req.params.id, req.body);
        res.json(lead);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// POST /api/leads/:id/convert — Convert lead to client
router.post('/:id/convert', authenticate, authorize('leads', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await leadService.convertToClient(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// PATCH /api/leads/:id/stage — Update stage (for Kanban drag-drop)
router.patch('/:id/stage', authenticate, authorize('leads', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const { stage, lost_reason } = req.body;
        const lead = await leadService.updateStage(req.params.id, stage, lost_reason);
        res.json(lead);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, authorize('leads', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await leadService.delete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
