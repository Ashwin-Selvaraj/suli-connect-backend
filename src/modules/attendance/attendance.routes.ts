import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { authGuard } from '../../common/guards/auth';
import { requireRoles, requireAdmin } from '../../common/guards/roles';

const router = Router();

router.use(authGuard);

// GET /attendance - List attendance (filtered by user/date range)
router.get('/', attendanceController.list);

// GET /attendance/me - Current user's attendance for date
router.get('/me', attendanceController.me);

// POST /attendance/check-in - Check in
router.post('/check-in', attendanceController.checkIn);

// POST /attendance/check-out - Check out
router.post('/check-out', attendanceController.checkOut);

// POST /attendance/:id/override - Admin override
router.post('/:id/override', requireAdmin, attendanceController.override);

export default router;
