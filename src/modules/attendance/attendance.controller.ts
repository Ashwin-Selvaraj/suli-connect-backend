import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { getPagination, paginate } from '../../common/utils';
import type { UserRole } from '@prisma/client';

const overrideSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  reason: z.string().min(1),
});

export async function me(req: Request, res: Response): Promise<void> {
  const dateStr = req.query.date as string;
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);

  const attendance = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: req.user!.id,
        date,
      },
    },
  });

  res.json(attendance ?? { date, checkInAt: null, checkOutAt: null });
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

export async function checkIn(req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: { userId: req.user!.id, date: today },
    },
  });

  if (existing?.checkInAt) {
    res.status(400).json({ error: 'Already checked in today' });
    return;
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date: { userId: req.user!.id, date: today },
    },
    create: {
      userId: req.user!.id,
      date: today,
      checkInAt: new Date(),
    },
    update: { checkInAt: new Date() },
  });

  res.status(201).json(attendance);
}

export async function checkOut(req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: { userId: req.user!.id, date: today },
    },
  });

  if (!existing) {
    res.status(400).json({ error: 'No check-in found for today' });
    return;
  }
  if (existing.checkOutAt) {
    res.status(400).json({ error: 'Already checked out today' });
    return;
  }

  const attendance = await prisma.attendance.update({
    where: {
      userId_date: { userId: req.user!.id, date: today },
    },
    data: { checkOutAt: new Date() },
  });

  res.json(attendance);
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
