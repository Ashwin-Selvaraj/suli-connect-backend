import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response): Promise<void> {
  const where: Record<string, unknown> = { deletedAt: null };
  const user = req.user!;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.domainId) {
    where.id = user.domainId;
  }

  const domains = await prisma.domain.findMany({
    where,
    include: { _count: { select: { teams: true, users: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(domains);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const domain = await prisma.domain.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      teams: { where: { deletedAt: null }, select: { id: true, name: true, leadId: true } },
      _count: { select: { users: true } },
    },
  });

  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  const user = req.user!;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.domainId !== domain.id) {
    res.status(403).json({ error: 'Cannot access this domain' });
    return;
  }

  res.json(domain);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const domain = await prisma.domain.create({
      data: { name: body.name, description: body.description },
    });
    res.status(201).json(domain);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create domain' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const domain = await prisma.domain.update({
      where: { id: req.params.id },
      data: body,
    });
    res.json(domain);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update domain' });
  }
}
