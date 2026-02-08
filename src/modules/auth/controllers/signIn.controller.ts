import { Request, Response } from 'express';
import { prisma } from '../../../prisma/client';
import * as tokenService from '../services/token.service';
import { getAccessTokenFromRequest } from '../services/cookie.service';

/**
 * POST /api/auth/sign-in
 * Called only after OAuth redirect (?auth=success). Session is via cookies.
 * Returns minimal user so frontend can decide redirect to onboarding or home.
 * Full profile from GET /api/users/me.
 */
export async function signIn(req: Request, res: Response): Promise<void> {
  const accessToken = getAccessTokenFromRequest(req);

  if (!accessToken) {
    res.status(401).json({
      statusCode: 401,
      message: 'No session found. Please sign in again.',
    });
    return;
  }

  let payload: { sub: string };
  try {
    payload = tokenService.verifyAccessToken(accessToken);
  } catch {
    res.status(401).json({
      statusCode: 401,
      message: 'Invalid or expired session. Please sign in again.',
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      profileImageUrl: true,
      role: true,
      onboardingCompleted: true,
    },
  });

  if (!user) {
    res.status(401).json({
      statusCode: 401,
      message: 'Invalid or expired session. Please sign in again.',
    });
    return;
  }

  const isProfileComplete = !!(
    user.name &&
    user.name.length > 1 &&
    !user.name.startsWith('User ') &&
    !user.name.startsWith('Wallet ')
  );

  res.json({
    user: {
      id: user.id,
      name: user.fullName ?? user.name ?? null,
      email: user.email ?? null,
      avatarUrl: user.avatarUrl ?? user.profileImageUrl ?? null,
      role: user.role,
      onboardingComplete: user.onboardingCompleted,
      isProfileComplete,
    },
  });
}
