import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';

/**
 * Require user to have one of the allowed roles.
 */
export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Require admin (SUPER_ADMIN or ADMIN).
 */
export const requireAdmin = requireRoles('SUPER_ADMIN', 'ADMIN');
