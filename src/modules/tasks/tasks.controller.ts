import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { canManage } from '../../common/hierarchy';
import { getPagination, paginate } from '../../common/utils';
import type { UserRole, TaskStatus } from '../../common/types';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  domainId: z.string(),
  teamId: z.string(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum([
    'NOT_STARTED', 'IN_PROGRESS', 'BLOCKED',
    'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED',
  ]).optional(),
});

const assignSchema = z.object({
  userIds: z.array(z.string()).min(1),
  validators: z.array(z.string()).optional(), // User IDs who can verify
});

const addUpdateSchema = z.object({
  comment: z.string().optional(),
  proofUrls: z.array(z.string().url()).optional(),
  statusChange: z.enum([
    'NOT_STARTED', 'IN_PROGRESS', 'BLOCKED',
    'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED',
  ]).optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const domainId = req.query.domainId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  const status = req.query.status as TaskStatus | undefined;
  const assignedToMe = req.query.assignedToMe === 'true';
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where: Record<string, unknown> = { deletedAt: null };

  if (domainId) where.domainId = domainId;
  if (teamId) where.teamId = teamId;
  if (status) where.status = status;

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    if (user.domainId) where.domainId = user.domainId;
    if (user.teamId) where.teamId = user.teamId;
  }

  if (assignedToMe) {
    where.assignments = { some: { userId: user.id } };
  }

  const { skip, take } = getPagination({ page, limit });

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        domain: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.task.count({ where }),
  ]);

  res.json(paginate(tasks, total, { page, limit }));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      domain: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true } } },
      },
      verifications: {
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const user = req.user!;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    const isAssigned = task.assignments.some((a: { userId: string }) => a.userId === user.id);
    const inDomain = user.domainId && task.domainId === user.domainId;
    const inTeam = user.teamId && task.teamId === user.teamId;
    if (!isAssigned && !inDomain && !inTeam) {
      res.status(403).json({ error: 'Cannot access this task' });
      return;
    }
  }

  res.json(task);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const user = req.user!;

    if (user.role === 'DOMAIN_HEAD' && body.domainId !== user.domainId) {
      res.status(403).json({ error: 'Cannot create task outside your domain' });
      return;
    }
    if (user.role === 'TEAM_LEAD' && body.teamId !== user.teamId) {
      res.status(403).json({ error: 'Cannot create task outside your team' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        domainId: body.domainId,
        teamId: body.teamId,
      },
      include: {
        domain: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const user = req.user!;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.domainId && existing.domainId !== user.domainId) {
        res.status(403).json({ error: 'Cannot update task outside your domain' });
        return;
      }
      if (user.teamId && existing.teamId !== user.teamId) {
        res.status(403).json({ error: 'Cannot update task outside your team' });
        return;
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: body,
      include: {
        domain: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function assign(req: Request, res: Response): Promise<void> {
  try {
    const body = assignSchema.parse(req.body);
    const taskId = req.params.id;

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignments: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const user = req.user!;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.domainId && task.domainId !== user.domainId) {
        res.status(403).json({ error: 'Cannot assign task outside your domain' });
        return;
      }
    }

    // Fetch target users and verify hierarchy (cannot assign upward)
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: body.userIds },
        deletedAt: null,
        isActive: true,
      },
    });

    for (const target of targetUsers) {
      if (!canManage(user.role, target.role)) {
        res.status(403).json({
          error: `Cannot assign task to user ${target.name} with higher role`,
        });
        return;
      }
    }

    const validators = body.validators ?? [];
    const validatorSet = new Set(validators);

    await prisma.$transaction([
      prisma.taskAssignment.deleteMany({ where: { taskId } }),
      ...body.userIds.map((userId) =>
        prisma.taskAssignment.create({
          data: {
            taskId,
            userId,
            isValidator: validatorSet.has(userId),
          },
        })
      ),
    ]);

    const updated = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to assign task' });
  }
}

export async function addUpdate(req: Request, res: Response): Promise<void> {
  try {
    const body = addUpdateSchema.parse(req.body);
    const taskId = req.params.id;

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignments: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const isAssigned = task.assignments.some((a: { userId: string }) => a.userId === req.user!.id);
    if (!isAssigned && req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only assigned users can add updates' });
      return;
    }

    const updateData: Record<string, unknown> = {
      taskId,
      userId: req.user!.id,
      comment: body.comment,
      proofUrls: body.proofUrls ?? [],
      statusChange: body.statusChange ?? undefined,
    };

    const update = await prisma.taskUpdate.create({
      data: updateData as { taskId: string; userId: string; comment?: string; proofUrls: string[]; statusChange?: TaskStatus },
      include: { user: { select: { id: true, name: true } } },
    });

    if (body.statusChange) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: body.statusChange as TaskStatus },
      });
    }

    res.status(201).json(update);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to add update' });
  }
}

export async function softDelete(req: Request, res: Response): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const user = req.user!;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    if (user.domainId && task.domainId !== user.domainId) {
      res.status(403).json({ error: 'Cannot delete task outside your domain' });
      return;
    }
  }

  await prisma.task.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  res.json({ message: 'Task deleted' });
}
