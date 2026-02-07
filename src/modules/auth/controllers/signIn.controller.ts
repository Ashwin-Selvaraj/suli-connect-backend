import { Request, Response } from 'express';
import { prisma } from '../../../prisma/client';
import * as tokenService from '../services/token.service';
import { getAccessTokenFromRequest } from '../services/cookie.service';

/** Sign-in response user shape */
interface SignInUserResponse {
  id: string;
  userName: string;
  name: string;
  avatarUrl: string;
  isProfileComplete: boolean;
  onboardingComplete: boolean;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
}

function toSignInUser(user: {
  id: string;
  phone?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  onboardingCompleted: boolean;
}): SignInUserResponse {
  const userName =
    user.email?.split('@')[0] ||
    user.phone ||
    user.walletAddress?.slice(0, 10) ||
    user.id.slice(0, 8) ||
    '';
  const isProfileComplete = !!(user.name && user.name.length > 1 && !user.name.startsWith('User ') && !user.name.startsWith('Wallet '));
  return {
    id: user.id,
    userName,
    name: user.name || '',
    avatarUrl: user.avatarUrl || '',
    isProfileComplete,
    onboardingComplete: user.onboardingCompleted,
    role: user.role,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

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
      walletAddress: true,
      name: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      onboardingCompleted: true,
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
    user: toSignInUser(user),
    accessToken,
  });
}
