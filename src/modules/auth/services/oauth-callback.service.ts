import { prisma } from '../../../prisma/client';
import * as googleService from '../strategies/google.service';
import * as providerService from './provider.service';
import * as profileService from './profile.service';
import * as tokenService from './token.service';
import * as sessionService from './session.service';
import type { AuthResponse } from '../dtos/auth-response.dto';

export type OAuthState = {
  type: 'login' | 'signup' | 'link';
  referral?: string;
  userId?: string;
};

/** Parse OAuth state from query */
export function parseState(stateStr: string | undefined): OAuthState {
  if (!stateStr) return { type: 'login' };
  try {
    return JSON.parse(Buffer.from(stateStr, 'base64').toString()) as OAuthState;
  } catch {
    return { type: 'login' };
  }
}

/** Encode OAuth state */
export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

/** Handle Google OAuth callback - decide login / signup / link */
export async function handleGoogleCallback(
  code: string,
  state: OAuthState,
  deviceInfo?: { userAgent?: string; ipAddress?: string }
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>; accessToken: string; refreshToken: string }> {
  const tokens = await googleService.exchangeCodeForTokens(code);
  const profile = await googleService.fetchGoogleProfile(tokens.access_token);

  let user = await providerService.findUserByGoogleId(profile.id);

  if (state.type === 'link' && state.userId) {
    // Link Google to existing user
    if (user && user.id !== state.userId) {
      throw new Error('Google account already linked to another user');
    }
    await providerService.linkGoogleToUser(state.userId, profile.id, tokens.access_token);
    user = await prisma.user.findUnique({ where: { id: state.userId } });
    if (!user) throw new Error('User not found');
  } else if (!user) {
    // Signup - create user from Google
    user = await profileService.createUserFromGoogle(
      profile.id,
      profile.email,
      profile.name,
      profile.picture
    );
  }

  if (!user.isActive || user.deletedAt) throw new Error('Account disabled');

  const payload = profileService.toAuthPayload(user);
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken(user.id);
  await sessionService.createSession(user.id, refreshToken, deviceInfo);

  return { user, accessToken, refreshToken };
}
