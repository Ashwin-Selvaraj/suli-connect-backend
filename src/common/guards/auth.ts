import { Request, Response, NextFunction } from 'express';
import * as tokenService from '../../modules/auth/services/token.service';
import type { AuthUser } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Extract and verify JWT access token from Authorization header.
 */
export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = tokenService.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      phone: payload.phone ?? null,
      role: payload.role,
      domainId: payload.domainId ?? null,
      teamId: payload.teamId ?? null,
      reportingManagerId: payload.reportingManagerId ?? null,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
