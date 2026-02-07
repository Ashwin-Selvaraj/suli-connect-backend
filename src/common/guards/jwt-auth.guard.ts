import { Request, Response, NextFunction } from 'express';
import * as tokenService from '../../modules/auth/services/token.service';
import { getAccessTokenFromRequest } from '../../modules/auth/services/cookie.service';
import type { AuthUser } from '../types';

/**
 * JWT auth guard - validates access token from cookie or Authorization header.
 * Attaches user to request.
 */
export async function jwtAuthGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized. Send access_token cookie (with credentials: "include") or Authorization: Bearer <token>.',
      });
      return;
    }

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
    res.status(401).json({ statusCode: 401, message: 'Invalid or expired token' });
  }
}
