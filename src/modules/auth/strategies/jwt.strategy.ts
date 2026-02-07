import { Request } from 'express';
import * as tokenService from '../services/token.service';
import type { AuthUserPayload } from '../dtos/auth-response.dto';

/** Extract and verify access token from Authorization header */
export function verifyAccessToken(req: Request): AuthUserPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = tokenService.verifyAccessToken(token);
    return decoded;
  } catch {
    return null;
  }
}
