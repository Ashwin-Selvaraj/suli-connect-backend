import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types';

/**
 * Roles guard - requires user to have one of the allowed roles.
 * Use after jwtAuthGuard.
 */
export function rolesGuard(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }
    const role = req.user.role as UserRole;
    if (!allowedRoles.includes(role)) {
      res.status(403).json({ statusCode: 403, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
