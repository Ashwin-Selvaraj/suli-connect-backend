import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { getPagination, paginate } from '../../common/utils';

export async function me(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      reputationScore: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
}

export async function getByUser(req: Request, res: Response): Promise<void> {
  const targetId = req.params.userId;
  const actor = req.user!;

  if (targetId !== actor.id) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { domainId: true, teamId: true },
      });
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (actor.domainId && target.domainId !== actor.domainId) {
        res.status(403).json({ error: 'Cannot view reputation outside your domain' });
        return;
      }
      if (actor.teamId && target.teamId !== actor.teamId) {
        res.status(403).json({ error: 'Cannot view reputation outside your team' });
        return;
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId, deletedAt: null },
    select: {
      id: true,
      name: true,
      reputationScore: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  const targetId = req.params.userId;
  const actor = req.user!;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  if (targetId !== actor.id) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { domainId: true, teamId: true },
      });
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (actor.domainId && target.domainId !== actor.domainId) {
        res.status(403).json({ error: 'Cannot view logs outside your domain' });
        return;
      }
    }
  }

  const { skip, take } = getPagination({ page, limit });

  const [logs, total] = await Promise.all([
    prisma.reputationLog.findMany({
      where: { userId: targetId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.reputationLog.count({ where: { userId: targetId } }),
  ]);

  res.json(paginate(logs, total, { page, limit }));
}
