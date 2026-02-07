import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { onboardingPayloadSchema } from './dtos/complete-onboarding.dto';

/** Derive purpose from engagement array */
function derivePurpose(engagement: string[]): 'Creator' | 'Developer' | 'Investor' | 'Gamer' | 'Other' {
  if (engagement.includes('Support/Donate')) return 'Investor';
  if (engagement.includes('Contributor')) return 'Creator';
  if (engagement.includes('Live in village')) return 'Other';
  if (engagement.includes('Visitor')) return 'Other';
  if (engagement.includes('Volunteer')) return 'Other';
  return 'Other';
}

/** Generate unique username from fullName + suffix if needed */
async function ensureUniqueUsername(base: string, excludeUserId?: string): Promise<string> {
  const sanitized = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 20);
  const baseName = sanitized || 'user';
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? baseName : `${baseName}_${suffix}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing || existing.id === excludeUserId) return candidate;
    suffix++;
  }
}

/**
 * POST /api/onboarding
 * Complete user onboarding. Requires JWT (cookie or Bearer).
 * Accepts full multi-step payload from OnboardingFormValues.
 * authGuard runs first and sets req.user.
 */
export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    return;
  }

  let body: z.infer<typeof onboardingPayloadSchema>;
  try {
    body = onboardingPayloadSchema.parse(req.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        statusCode: 400,
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    throw err;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true, email: true, username: true },
  });

  if (!existingUser) {
    res.status(404).json({ statusCode: 404, message: 'User not found' });
    return;
  }

  if (existingUser.onboardingCompleted) {
    res.status(400).json({
      statusCode: 400,
      message: 'Onboarding already completed',
    });
    return;
  }

  let username = body.username?.trim();
  if (username) {
    const usernameTaken = await prisma.user.findUnique({
      where: { username },
    });
    if (usernameTaken && usernameTaken.id !== userId) {
      res.status(400).json({
        statusCode: 400,
        message: 'Username is already taken',
      });
      return;
    }
  } else {
    username = await ensureUniqueUsername(body.fullName, userId);
  }

  const purpose = derivePurpose(body.engagement);
  const onboardingData = body as unknown as Record<string, unknown>;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: body.fullName,
      name: body.fullName,
      username,
      email: body.email ?? existingUser.email,
      phone: body.phone ?? undefined,
      profileImageUrl: body.profileImageUrl ?? undefined,
      avatarUrl: body.profileImageUrl ?? undefined,
      purpose: purpose as 'Creator' | 'Developer' | 'Investor' | 'Gamer' | 'Other',
      onboardingCompleted: true,
      onboardingData,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      avatarUrl: true,
      bio: true,
      purpose: true,
      role: true,
      onboardingCompleted: true,
      isActive: true,
      authProvider: true,
      lastLoginAt: true,
      onboardingData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ user });
}
