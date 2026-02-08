import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { requireAdmin } from '../../common/guards/roles';

const router = Router();

// GET /attendance - List attendance (filtered by user/date range)
router.get('/', attendanceController.list);

// GET /attendance/me - Current user's attendance for date
router.get('/me', attendanceController.me);

// GET /attendance/today - Enriched today's attendance (legacy, from Attendance table)
router.get('/today', attendanceController.today);

// GET /attendance/daily-summary?date=YYYY-MM-DD - Computed from events
router.get('/daily-summary', attendanceController.dailySummary);

// POST /attendance/check-in - Append-only event insert
router.post('/check-in', attendanceController.checkIn);

// POST /attendance/check-out - Check out
router.post('/check-out', attendanceController.checkOut);

// POST /attendance/:id/override - Admin override
router.post('/:id/override', requireAdmin, attendanceController.override);

export default router;
