import { Request, Response } from 'express';
import { prisma } from '../../../prisma/client';
import * as tokenService from '../services/token.service';
import { getAccessTokenFromRequest } from '../services/cookie.service';
import { toAuthUserResponse } from '../services/auth-user-response.service';

/**
 * POST /api/auth/sign-in
 * Return current user from session (cookie or Bearer).
 * Used by frontend after OAuth redirects and on app load.
 */
export async function signIn(req: Request, res: Response): Promise<void> {
  const accessToken = getAccessTokenFromRequest(req);

  if (!accessToken) {
    res.status(400).json({
      statusCode: 400,
      message: 'No session found. Please sign in again.',
    });
    return;
  }

  let payload: { sub: string };
  try {
    payload = tokenService.verifyAccessToken(accessToken);
  } catch {
    res.status(400).json({
      statusCode: 400,
      message: 'Invalid or expired session. Please sign in again.',
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      profileImageUrl: true,
      role: true,
      isActive: true,
      onboardingCompleted: true,
      reputationScore: true,
      tasksCompletedCount: true,
      daysWorkedCount: true,
      team: { select: { name: true } },
      reportingManager: { select: { name: true } },
    },
  });

  if (!user) {
    res.status(400).json({
      statusCode: 400,
      message: 'Invalid or expired session. Please sign in again.',
    });
    return;
  }

  res.json({
    user: toAuthUserResponse(user),
    accessToken,
  });
}
