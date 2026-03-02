import { Router, Response } from 'express';
import { projectService } from './project.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'projects');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const router = Router();

router.get('/', authenticate, authorize('projects', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await projectService.findAll({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            status: req.query.status as string,
            client_id: req.query.client_id as string,
            search: req.query.search as string,
        });
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, authorize('projects', 'read'), async (req: AuthRequest, res: Response) => {
    try {
        const project = await projectService.findById(req.params.id);
        res.json(project);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.post('/', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const project = await projectService.create(req.body);
        res.status(201).json(project);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const project = await projectService.update(req.params.id, req.body, req.user!.id);
        res.json(project);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, authorize('projects', 'delete'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await projectService.delete(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// Checklist routes
router.post('/:id/checklist', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const item = await projectService.addChecklistItem(req.params.id, req.body.label);
        res.status(201).json(item);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.put('/checklist/:itemId/toggle', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const item = await projectService.toggleChecklistItem(req.params.itemId);
        res.json(item);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/checklist/:itemId', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await projectService.deleteChecklistItem(req.params.itemId);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// File routes
router.post('/:id/files', authenticate, authorize('projects', 'write'), upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const file = await projectService.addFile(req.params.id, req.file);
        res.status(201).json(file);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.delete('/files/:fileId', authenticate, authorize('projects', 'write'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await projectService.deleteFile(req.params.fileId);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
