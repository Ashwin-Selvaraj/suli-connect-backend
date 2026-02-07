import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';
import { canManage } from '../../common/hierarchy';
import { getPagination, paginate } from '../../common/utils';
import type { UserRole } from '../../common/types';

const createSchema = z.object({
  phone: z.string().min(10),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum([
    'SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD',
    'SENIOR_WORKER', 'WORKER', 'VOLUNTEER', 'VISITOR',
  ]),
  domainId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  reportingManagerId: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  password: z.string().min(6).optional(),
});

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id, deletedAt: null },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      domainId: true,
      teamId: true,
      reportingManagerId: true,
      reputationScore: true,
      domain: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      reportingManager: { select: { id: true, name: true } },
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const domainId = req.query.domainId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const role = req.query.role as UserRole | undefined;

  const { skip, take } = getPagination({ page, limit });

  // Build filter based on hierarchy
  const where: Record<string, unknown> = { deletedAt: null };

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    // Admins see all
  } else if (user.role === 'DOMAIN_HEAD') {
    where.domainId = user.domainId;
  } else if (user.role === 'TEAM_LEAD') {
    where.teamId = user.teamId;
  } else {
    // Workers see only themselves
    where.id = user.id;
  }

  if (domainId) where.domainId = domainId;
  if (teamId) where.teamId = teamId;
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        domainId: true,
        teamId: true,
        reportingManagerId: true,
        reputationScore: true,
        isActive: true,
        domain: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      skip,
      take,
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json(paginate(users, total, { page, limit }));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const target = await prisma.user.findUnique({
    where: { id: req.params.id, deletedAt: null },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      domainId: true,
      teamId: true,
      reportingManagerId: true,
      reputationScore: true,
      isActive: true,
      domain: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      reportingManager: { select: { id: true, name: true } },
    },
  });

  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Hierarchy check: user can only view those they can manage
  const actor = req.user!;
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
    if (actor.domainId && target.domainId !== actor.domainId) {
      res.status(403).json({ error: 'Cannot view user outside your domain' });
      return;
    }
    if (actor.teamId && target.teamId !== actor.teamId) {
      res.status(403).json({ error: 'Cannot view user outside your team' });
      return;
    }
  }

  res.json(target);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const actor = req.user!;

    // Hierarchy: cannot create user with higher role
    if (!canManage(actor.role, body.role as UserRole)) {
      res.status(403).json({ error: 'Cannot create user with higher role' });
      return;
    }

    // Domain/team scope for non-admins
    if (actor.role === 'DOMAIN_HEAD' && body.domainId !== actor.domainId) {
      res.status(403).json({ error: 'Cannot create user outside your domain' });
      return;
    }
    if (actor.role === 'TEAM_LEAD' && body.teamId !== actor.teamId) {
      res.status(403).json({ error: 'Cannot create user outside your team' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
      res.status(400).json({ error: 'Phone already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        phone: body.phone,
        name: body.name,
        passwordHash,
        role: body.role as UserRole,
        domainId: body.domainId ?? undefined,
        teamId: body.teamId ?? undefined,
        reportingManagerId: body.reportingManagerId ?? undefined,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        domainId: true,
        teamId: true,
        reportingManagerId: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const targetId = req.params.id;
    const actor = req.user!;

    const target = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
    });

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!canManage(actor.role, target.role)) {
      res.status(403).json({ error: 'Cannot update user with higher role' });
      return;
    }

    if (actor.role === 'DOMAIN_HEAD' && target.domainId !== actor.domainId) {
      res.status(403).json({ error: 'Cannot update user outside your domain' });
      return;
    }
    if (actor.role === 'TEAM_LEAD' && target.teamId !== actor.teamId) {
      res.status(403).json({ error: 'Cannot update user outside your team' });
      return;
    }

    if (body.role && !canManage(actor.role, body.role as UserRole)) {
      res.status(403).json({ error: 'Cannot assign higher role' });
      return;
    }

    const updateData: Record<string, unknown> = { ...body };
    delete updateData.password;
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        domainId: true,
        teamId: true,
        reportingManagerId: true,
      },
    });

    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  const targetId = req.params.id;
  const target = await prisma.user.findUnique({
    where: { id: targetId, deletedAt: null },
  });

  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { isActive: false },
  });

  res.json({ message: 'User deactivated' });
}
