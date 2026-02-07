import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { getPagination, paginate } from '../../common/utils';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const actorId = req.query.actorId as string | undefined;
  const action = req.query.action as string | undefined;
  const entityType = req.query.entityType as string | undefined;

  const where: Record<string, unknown> = {};
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const { skip, take } = getPagination({ page, limit });

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json(paginate(logs, total, { page, limit }));
}

export async function dashboard(req: Request, res: Response): Promise<void> {
  const [userCount, domainCount, teamCount, taskCount, attendanceToday] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.domain.count({ where: { deletedAt: null } }),
    prisma.team.count({ where: { deletedAt: null } }),
    prisma.task.count({ where: { deletedAt: null } }),
    prisma.attendance.count({
      where: {
        date: new Date(new Date().setHours(0, 0, 0, 0)),
        checkInAt: { not: null },
      },
    }),
  ]);

  res.json({
    users: userCount,
    domains: domainCount,
    teams: teamCount,
    tasks: taskCount,
    attendanceToday,
  });
}
