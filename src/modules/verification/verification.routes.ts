import { Router } from 'express';
import * as verificationController from './verification.controller';
import { requireAdmin } from '../../common/guards/roles';

const router = Router();

// POST /verification/:taskId - Verify or reject task
router.post('/:taskId', verificationController.verify);

// POST /verification/:taskId/admin-override - Admin override (bypass hierarchy)
router.post('/:taskId/admin-override', requireAdmin, verificationController.adminOverride);

export default router;
