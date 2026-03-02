import { Router } from 'express';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { getActivityFeed } from './activity.controller';

const router = Router();

router.get('/', authMiddleware, getActivityFeed);

export default router;
