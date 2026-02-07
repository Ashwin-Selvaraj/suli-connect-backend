import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { canVerify } from '../../common/hierarchy';

type AssignmentLike = { userId: string; isValidator: boolean };

const verifySchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
});

export async function verify(req: Request, res: Response): Promise<void> {
  try {
    const body = verifySchema.parse(req.body);
    const taskId = req.params.taskId;
    const validatorId = req.user!.id;

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignments: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (task.status !== 'PENDING_VERIFICATION') {
      res.status(400).json({ error: 'Task is not pending verification' });
      return;
    }

    const assignment = task.assignments.find((a: AssignmentLike) => a.userId === validatorId);
    const isValidator = assignment?.isValidator ?? false;

    if (!isValidator && req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'You are not assigned as a validator for this task' });
      return;
    }

    const assignees = task.assignments.filter((a: AssignmentLike) => !a.isValidator);
    if (assignees.some((a: AssignmentLike) => a.userId === validatorId)) {
      res.status(403).json({ error: 'Cannot verify your own task' });
      return;
    }

    const validator = await prisma.user.findUnique({
      where: { id: validatorId },
    });
    const assignee = assignees[0];
    if (assignee && validator && req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
      const assigneeUser = await prisma.user.findUnique({
        where: { id: assignee.userId },
      });
      if (assigneeUser && !canVerify(validator.role, assigneeUser.role)) {
        res.status(403).json({ error: 'Validator must be higher in hierarchy than assignee' });
        return;
      }
    }

    const newStatus = body.approved ? 'VERIFIED' : 'REJECTED';

    const [verification] = await prisma.$transaction([
      prisma.taskVerification.create({
        data: {
          taskId,
          assigneeId: assignees[0]?.userId ?? validatorId,
          validatorId,
          approved: body.approved,
          comment: body.comment,
        },
        include: {
          assignee: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
        },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus },
      }),
    ]);

    if (body.approved && assignees[0]) {
      const REPUTATION_DELTA = 10;
      await prisma.$transaction([
        prisma.reputationLog.create({
          data: {
            userId: assignees[0].userId,
            delta: REPUTATION_DELTA,
            reason: 'VERIFIED_TASK',
            referenceId: taskId,
          },
        }),
        prisma.user.update({
          where: { id: assignees[0].userId },
          data: {
            reputationScore: { increment: REPUTATION_DELTA },
            tasksCompletedCount: { increment: 1 },
          },
        }),
      ]);
    }

    res.status(201).json(verification);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Verification failed' });
  }
}

export async function adminOverride(req: Request, res: Response): Promise<void> {
  try {
    const body = verifySchema.parse(req.body);
    const taskId = req.params.taskId;

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignments: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const assignees = task.assignments.filter((a: AssignmentLike) => !a.isValidator);
    const assigneeId = assignees[0]?.userId ?? req.user!.id;
    const newStatus = body.approved ? 'VERIFIED' : 'REJECTED';

    const [verification] = await prisma.$transaction([
      prisma.taskVerification.create({
        data: {
          taskId,
          assigneeId,
          validatorId: req.user!.id,
          approved: body.approved,
          comment: body.comment,
          isAdminOverride: true,
        },
        include: {
          assignee: { select: { id: true, name: true } },
          validator: { select: { id: true, name: true } },
        },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'VERIFICATION_ADMIN_OVERRIDE',
        entityType: 'task_verification',
        entityId: verification.id,
        payload: JSON.stringify({ taskId, approved: body.approved }),
      },
    });

    if (body.approved && assignees[0]) {
      const REPUTATION_DELTA = 10;
      await prisma.$transaction([
        prisma.reputationLog.create({
          data: {
            userId: assignees[0].userId,
            delta: REPUTATION_DELTA,
            reason: 'VERIFIED_TASK',
            referenceId: taskId,
          },
        }),
        prisma.user.update({
          where: { id: assignees[0].userId },
          data: {
            reputationScore: { increment: REPUTATION_DELTA },
            tasksCompletedCount: { increment: 1 },
          },
        }),
      ]);
    }

    res.status(201).json(verification);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Admin override failed' });
  }
}
