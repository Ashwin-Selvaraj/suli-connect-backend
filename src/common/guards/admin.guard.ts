import { Request, Response, NextFunction } from 'express';

/**
 * Admin guard - requires user.role to be SUPER_ADMIN or ADMIN.
 * Use after jwtAuthGuard.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    return;
  }
  const role = req.user.role;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    res.status(403).json({ statusCode: 403, message: 'Admin access required' });
    return;
  }
  next();
}
