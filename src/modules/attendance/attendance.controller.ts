import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { getPagination, paginate } from '../../common/utils';
import type { UserRole } from '../../common/types';
import * as attendanceService from './attendance.service';

const eventPayloadSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional(),
    locationId: z.string().optional(),
    taskId: z.string().optional(),
    deviceType: z.enum(['MOBILE', 'DESKTOP']).optional(),
  })
  .refine((d) => (d.latitude == null) === (d.longitude == null), {
    message: 'latitude and longitude must be provided together',
  });

const overrideSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  reason: z.string().min(1),
});

function formatHoursWorked(checkInAt: Date, checkOutAt: Date): string {
  const ms = checkOutAt.getTime() - checkInAt.getTime();
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatSummary(
  summary: {
    id: string;
    date: Date;
    firstCheckIn: Date | null;
    lastCheckOut: Date | null;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    sessionsCount: number;
    status: string;
    currentSessionStartedAt?: Date | null;
  }
) {
  let totalMins = summary.totalWorkMinutes;
  if (summary.currentSessionStartedAt) {
    totalMins += Math.floor(
      (Date.now() - summary.currentSessionStartedAt.getTime()) / 60_000
    );
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const hoursWorked = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return {
    id: summary.id,
    date: summary.date,
    firstCheckIn: summary.firstCheckIn,
    lastCheckOut: summary.lastCheckOut,
    totalWorkMinutes: totalMins,
    totalWorkedSeconds: totalMins * 60,
    currentSessionStartedAt: summary.currentSessionStartedAt?.toISOString() ?? null,
    totalBreakMinutes: summary.totalBreakMinutes,
    sessionsCount: summary.sessionsCount,
    status: summary.status,
    hoursWorked,
  };
}

/** GET /attendance/daily-summary?date=YYYY-MM-DD */
export async function dailySummary(req: Request, res: Response): Promise<void> {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }
    const userId = req.user!.id;

    const summary = await attendanceService.getDailySummary(userId, date);
    const formatted = formatSummary(summary);

    res.json({ summary: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get daily summary' });
  }
}

/** GET /attendance/me - Daily summary for a date (uses event-sourced data) */
export async function me(req: Request, res: Response): Promise<void> {
  const dateStr = req.query.date as string;
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);
  const userId = req.user!.id;

  const summary = await attendanceService.getDailySummary(userId, date);
  let totalMins = summary.totalWorkMinutes;
  if (summary.currentSessionStartedAt) {
    totalMins += Math.floor(
      (Date.now() - summary.currentSessionStartedAt.getTime()) / 60_000
    );
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const hoursWorked = h > 0 ? `${h}h ${m}m` : `${m}m`;

  res.json({
    date: summary.date,
    checkInAt: summary.firstCheckIn,
    checkOutAt: summary.lastCheckOut,
    totalWorkMinutes: totalMins,
    hoursWorked,
    status: summary.status,
  });
}

/** GET /attendance/today - Enriched today's attendance for current user */
export async function today(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary = await attendanceService.getDailySummary(userId, today);

  if (!summary.firstCheckIn && !summary.lastCheckOut && summary.sessionsCount === 0) {
    res.json({ attendance: null });
    return;
  }

  // Include current session when checked in (timer continues from previous sessions)
  let totalMins = summary.totalWorkMinutes;
  if (summary.currentSessionStartedAt) {
    totalMins += Math.floor(
      (Date.now() - summary.currentSessionStartedAt.getTime()) / 60_000
    );
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const hoursWorked = h > 0 ? `${h}h ${m}m` : `${m}m`;

  res.json({
    attendance: {
      id: summary.id,
      checkInAt: summary.firstCheckIn,
      checkOutAt: summary.lastCheckOut,
      hoursWorked,
      totalWorkMinutes: totalMins,
      totalWorkedSeconds: totalMins * 60,
      currentSessionStartedAt: summary.currentSessionStartedAt?.toISOString() ?? null,
      sessionsCount: summary.sessionsCount,
      status: summary.status,
    },
  });
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const userId = req.query.userId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where: Record<string, unknown> = {};

  // Hierarchy: admins can view anyone, domain head by domain, team lead by team
  if (userId) {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      where.userId = userId;
    } else if (user.role === 'DOMAIN_HEAD') {
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { domainId: true },
      });
      if (target?.domainId !== user.domainId) {
        res.status(403).json({ error: 'Cannot view attendance outside your domain' });
        return;
      }
      where.userId = userId;
    } else if (user.role === 'TEAM_LEAD') {
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamId: true },
      });
      if (target?.teamId !== user.teamId) {
        res.status(403).json({ error: 'Cannot view attendance outside your team' });
        return;
      }
      where.userId = userId;
    } else {
      where.userId = user.id; // Workers see only their own
    }
  } else {
    where.userId = user.id; // Default: own attendance
  }

  if (from || to) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  } else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    where.date = { gte: thirtyDaysAgo };
  }

  const { skip, take } = getPagination({ page, limit });

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, phone: true } } },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);

  res.json(paginate(records, total, { page, limit }));
}

/** POST /attendance/check-in – Append-only; always inserts new event */
export async function checkIn(req: Request, res: Response): Promise<void> {
  try {
    const body = eventPayloadSchema.parse(req.body ?? {});
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event = await attendanceService.insertCheckInEvent(userId, {
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      locationId: body.locationId,
      taskId: body.taskId,
      deviceType: body.deviceType as 'MOBILE' | 'DESKTOP' | undefined,
    });

    const summary = await attendanceService.computeAndStoreDailySummary(userId, today);

    res.status(201).json({
      event: {
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
      },
      summary: formatSummary(summary),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Check-in failed' });
  }
}

/** POST /attendance/check-out – Append-only; always inserts new event */
export async function checkOut(req: Request, res: Response): Promise<void> {
  try {
    const body = eventPayloadSchema.parse(req.body ?? {});
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event = await attendanceService.insertCheckOutEvent(userId, {
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      locationId: body.locationId,
      taskId: body.taskId,
      deviceType: body.deviceType as 'MOBILE' | 'DESKTOP' | undefined,
    });

    const summary = await attendanceService.computeAndStoreDailySummary(userId, today);

    res.json({
      event: {
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
      },
      summary: formatSummary(summary),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Check-out failed' });
  }
}

export async function override(req: Request, res: Response): Promise<void> {
  try {
    const body = overrideSchema.parse(req.body);
    const attendanceId = req.params.id;

    const existing = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }

    const attendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkInAt: body.checkInAt ? new Date(body.checkInAt) : undefined,
        checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : undefined,
        isOverridden: true,
        overrideBy: req.user!.id,
        overrideReason: body.reason,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'ATTENDANCE_OVERRIDE',
        entityType: 'attendance',
        entityId: attendanceId,
        payload: JSON.stringify({ reason: body.reason, changes: body }),
      },
    });

    res.json(attendance);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Override failed' });
  }
}
