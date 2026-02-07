import { Request, Response } from 'express';
import { z } from 'zod';
import * as sessionService from '../services/session.service';
import { clearRefreshTokenCookie } from '../services/cookie.service';
import { verifyAccessToken } from '../strategies/jwt.strategy';
import { refreshTokenSchema } from '../dtos/refresh-token.dto';

/** POST /auth/logout */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const validated = await sessionService.validateRefreshToken(body.refreshToken);
    if (validated) {
      await sessionService.revokeSession(validated.sessionId);
    }
    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Logout failed' });
  }
}

/** GET /auth/sessions - List sessions */
export async function listSessions(req: Request, res: Response): Promise<void> {
  const payload = verifyAccessToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const sessions = await sessionService.listSessions(payload.sub);
  res.json(sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  })));
}
