import { Router } from 'express';
import { globalSearch } from './search.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, globalSearch);

export default router;
