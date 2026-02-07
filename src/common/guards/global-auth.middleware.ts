import { Request, Response, NextFunction } from 'express';
import { isPublicRoute } from '../auth/public-routes';
import { jwtAuthGuard } from './jwt-auth.guard';

/**
 * Global auth middleware - protects all /api/* routes by default.
 * Public routes (sign-in, OAuth callbacks, OTP, wallet, etc.) skip auth.
 */
export function globalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.originalUrl?.split('?')[0] ?? req.path;
  const method = req.method;

  if (!path.startsWith('/api/')) {
    next();
    return;
  }

  if (isPublicRoute(method, path)) {
    next();
    return;
  }

  jwtAuthGuard(req, res, next);
}
