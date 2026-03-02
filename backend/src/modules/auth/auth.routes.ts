import { Router, Response } from 'express';
import { authService } from './auth.service';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response) => {
    try {
        const result = await authService.login(req.body.email, req.body.password);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// POST /api/auth/register (Admin only)
router.post(
    '/register',
    authenticate,
    authorizeRoles('ADMIN'),
    validate(registerSchema),
    async (req: AuthRequest, res: Response) => {
        try {
            const user = await authService.register(req.body);
            res.status(201).json(user);
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
);

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }
        const tokens = await authService.refresh(refreshToken);
        res.json(tokens);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await authService.getProfile(req.user!.id);
        res.json(user);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

export default router;
