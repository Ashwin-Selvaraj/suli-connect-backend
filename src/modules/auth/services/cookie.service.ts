import { Request, Response } from 'express';
import { authConfig } from '../config';

/** Set access token cookie (HTTP-only, short-lived) */
export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(authConfig.cookie.accessTokenName, accessToken, {
    maxAge: authConfig.cookie.accessTokenMaxAge,
    httpOnly: authConfig.cookie.httpOnly,
    secure: authConfig.cookie.secure,
    sameSite: authConfig.cookie.sameSite,
    path: '/',
  });
}

/** Read refresh token from cookie */
export function getRefreshTokenFromRequest(req: Request): string | null {
  return req.cookies?.[authConfig.cookie.refreshTokenName] ?? null;
}

/** Read access token from cookie or Authorization header */
export function getAccessTokenFromRequest(req: Request): string | null {
  const fromCookie = req.cookies?.[authConfig.cookie.accessTokenName];
  if (fromCookie) return fromCookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

/** Set refresh token cookie */
export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(authConfig.cookie.refreshTokenName, refreshToken, {
    maxAge: authConfig.cookie.refreshTokenMaxAge,
    httpOnly: authConfig.cookie.httpOnly,
    secure: authConfig.cookie.secure,
    sameSite: authConfig.cookie.sameSite,
    path: '/',
  });
}

/** Clear refresh token cookie */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(authConfig.cookie.refreshTokenName, { path: '/' });
}

/** Clear access token cookie */
export function clearAccessTokenCookie(res: Response): void {
  res.clearCookie(authConfig.cookie.accessTokenName, { path: '/' });
}
