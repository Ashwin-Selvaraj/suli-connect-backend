import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authConfig } from '../config';
import type { AuthUserPayload } from './auth.service';

export interface TokenPayload {
  sub: string; // userId
  type: 'access' | 'refresh';
  sessionId?: string;
}

/** Generate access token (short-lived) */
export function generateAccessToken(payload: AuthUserPayload): string {
  const tokenPayload = { ...payload, type: 'access' };
  return jwt.sign(tokenPayload, authConfig.jwt.accessSecret, {
    expiresIn: 15 * 60, // 15 minutes
  });
}

/** Generate refresh token (long-lived) */
export function generateRefreshToken(userId: string, sessionId = ''): string {
  const tokenPayload = { sub: userId, type: 'refresh', sessionId: sessionId || undefined };
  return jwt.sign(tokenPayload, authConfig.jwt.refreshSecret, {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
  });
}

/** Verify access token */
export function verifyAccessToken(token: string): AuthUserPayload & { type: 'access' } {
  const decoded = jwt.verify(token, authConfig.jwt.accessSecret) as TokenPayload & AuthUserPayload;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded as AuthUserPayload & { type: 'access' };
}

/** Verify refresh token */
export function verifyRefreshToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, authConfig.jwt.refreshSecret) as TokenPayload;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return { userId: decoded.sub };
}

/** Hash refresh token for storage */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
