import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';
import { clearRefreshTokenCookie, clearAccessTokenCookie, getRefreshTokenFromRequest } from '../services/cookie.service';
import { verifyAccessToken } from '../strategies/jwt.strategy';

/** POST /api/auth/logout - Accept empty body; clear session via cookie (or body refreshToken if provided) */
export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken =
    getRefreshTokenFromRequest(req) ?? (req.body?.refreshToken as string | undefined);
  if (refreshToken) {
    // Revoke session in background - don't await (respond fast)
    sessionService
      .validateRefreshToken(refreshToken)
      .then((validated) => {
        if (validated) return sessionService.revokeSession(validated.sessionId);
      })
      .catch(() => {});
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
