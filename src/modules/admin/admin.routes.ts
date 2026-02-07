import { Router } from 'express';
import * as adminController from './admin.controller';
import { adminGuard } from '../../common/guards/admin.guard';

const router = Router();

router.use(adminGuard);

// GET /admin/audit-logs - List audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// GET /admin/dashboard - Basic stats (optional)
router.get('/dashboard', adminController.dashboard);

export default router;
