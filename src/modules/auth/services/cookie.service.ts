import { Response } from 'express';
import { authConfig } from '../config';

/** Set refresh token cookie */
export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(authConfig.cookie.refreshTokenName, refreshToken, {
    maxAge: authConfig.cookie.maxAge,
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
