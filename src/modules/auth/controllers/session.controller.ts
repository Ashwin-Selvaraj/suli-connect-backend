import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';
import { clearRefreshTokenCookie, clearAccessTokenCookie, getRefreshTokenFromRequest } from '../services/cookie.service';
import { verifyAccessToken } from '../strategies/jwt.strategy';

/** POST /api/auth/logout - Read refresh token from cookie, revoke session, clear cookies */
export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (refreshToken) {
    try {
      const validated = await sessionService.validateRefreshToken(refreshToken);
      if (validated) {
        await sessionService.revokeSession(validated.sessionId);
      }
    } catch {
      // Token invalid or expired - still clear cookies
    }
  }
  clearRefreshTokenCookie(res);
  clearAccessTokenCookie(res);
  res.json({ message: 'Logged out' });
}

/** GET /auth/sessions - List sessions */
export async function listSessions(req: Request, res: Response): Promise<void> {
  const payload = verifyAccessToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const sessions = await sessionService.listSessions(payload.sub);
  res.json(sessions.map((s: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: Date; expiresAt: Date }) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  })));
}
