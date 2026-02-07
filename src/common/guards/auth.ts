import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../prisma/client';
import type { AuthUser } from '../types';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Extract user from Authorization header (Bearer token or basic auth).
 * Stub implementation: expects "Bearer <userId>" for now.
 * Replace with JWT validation when auth is fully implemented.
 */
export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization' });
      return;
    }

    const token = authHeader.slice(7);

    // Stub: treat token as user ID for development
    // TODO: Replace with JWT decode + verify
    const user = await prisma.user.findUnique({
      where: { id: token, isActive: true, deletedAt: null },
      select: {
        id: true,
        phone: true,
        role: true,
        domainId: true,
        teamId: true,
        reportingManagerId: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed' });
  }
}
