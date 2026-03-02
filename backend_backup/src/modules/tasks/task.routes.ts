import { Router, Response } from 'express';
import { taskService } from './task.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticate, authorize('tasks', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        // Developers can only see their own tasks
        const filters: any = {
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 50,
            project_id: req.query.project_id as string,
            status: req.query.status as string,
            priority: req.query.priority as string,
        };

        if (req.user!.role === 'DEVELOPER') {
            filters.assigned_user_id = req.user!.id;
        } else if (req.query.assigned_user_id) {
            filters.assigned_user_id = req.query.assigned_user_id as string;
        }

        const result = await taskService.findAll(filters);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/kanban/:projectId', authenticate, authorize('tasks', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const board = await taskService.getKanbanByProject(req.params.projectId);
        res.json(board);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, authorize('tasks', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const task = await taskService.findById(req.params.id);
        // Developer can only view assigned tasks
        if (req.user!.role === 'DEVELOPER' && task.assigned_user?.id !== req.user!.id) {
            return res.status(403).json({ error: 'Access forbidden: can only view assigned tasks' });
        }
        res.json(task);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/', authenticate, authorize('tasks', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const task = await taskService.create(req.body);
        res.status(201).json(task);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, authorize('tasks', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        // Developers can only update status
        if (req.user!.role === 'DEVELOPER') {
            const task = await taskService.findById(req.params.id);
            if (task.assigned_user?.id !== req.user!.id) {
                return res.status(403).json({ error: 'Access forbidden' });
            }
            // Only allow status update
            const result = await taskService.update(req.params.id, { status: req.body.status });
            return res.json(result);
        }

        const result = await taskService.update(req.params.id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, authorize('tasks', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await taskService.delete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
