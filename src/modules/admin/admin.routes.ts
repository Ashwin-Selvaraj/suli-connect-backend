import { Router } from 'express';
import * as adminController from './admin.controller';
import { authGuard } from '../../common/guards/auth';
import { requireAdmin } from '../../common/guards/roles';

const router = Router();

router.use(authGuard);
router.use(requireAdmin);

// GET /admin/audit-logs - List audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// GET /admin/dashboard - Basic stats (optional)
router.get('/dashboard', adminController.dashboard);

export default router;
