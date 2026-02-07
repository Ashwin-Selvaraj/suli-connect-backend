import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';

const createSchema = z.object({
  name: z.string().min(1),
  domainId: z.string(),
  leadId: z.string().optional().nullable(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  leadId: z.string().optional().nullable(),
});

export async function list(req: Request, res: Response): Promise<void> {
  const domainId = req.query.domainId as string | undefined;
  const where: Record<string, unknown> = { deletedAt: null };
  const user = req.user!;

  if (domainId) where.domainId = domainId;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    if (user.domainId) where.domainId = user.domainId;
    if (user.teamId) where.id = user.teamId; // Team lead sees only their team
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      domain: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
      _count: { select: { users: true, tasks: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(teams);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const team = await prisma.team.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      domain: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, phone: true } },
      users: { where: { deletedAt: null }, select: { id: true, name: true, role: true } },
    },
  });

  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const user = req.user!;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    if (user.domainId && team.domainId !== user.domainId) {
      res.status(403).json({ error: 'Cannot access this team' });
      return;
    }
  }

  res.json(team);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const user = req.user!;

    if (user.role === 'DOMAIN_HEAD' && body.domainId !== user.domainId) {
      res.status(403).json({ error: 'Cannot create team outside your domain' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        domainId: body.domainId,
        leadId: body.leadId ?? undefined,
      },
      include: {
        domain: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(team);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const existing = await prisma.team.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const user = req.user!;
    if (user.role === 'TEAM_LEAD' && existing.leadId !== user.id) {
      res.status(403).json({ error: 'Can only update your own team' });
      return;
    }
    if (user.role === 'DOMAIN_HEAD' && existing.domainId !== user.domainId) {
      res.status(403).json({ error: 'Cannot update team outside your domain' });
      return;
    }

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: body,
      include: {
        domain: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });
    res.json(team);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
}
