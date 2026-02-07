import { Router } from 'express';
import * as reputationController from './reputation.controller';
import { authGuard } from '../../common/guards/auth';

const router = Router();

router.use(authGuard);

// GET /reputation/me - Current user's reputation
router.get('/me', reputationController.me);

// GET /reputation/:userId - User reputation (if permitted)
router.get('/:userId', reputationController.getByUser);

// GET /reputation/:userId/logs - Reputation change logs (append-only, read-only)
router.get('/:userId/logs', reputationController.getLogs);

export default router;
