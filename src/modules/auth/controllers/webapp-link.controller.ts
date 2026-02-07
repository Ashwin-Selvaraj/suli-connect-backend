import { Request, Response } from 'express';
import * as oauthCallbackService from '../services/oauth-callback.service';
import { setRefreshTokenCookie } from '../services/cookie.service';
import { getDeviceInfo } from '../services/device-info.service';
import { buildAuthResponse } from '../services/auth.service';
import { verifyAccessToken } from '../strategies/jwt.strategy';

/** GET /webapp/auth/google/callback - OAuth callback */
export async function googleCallback(req: Request, res: Response): Promise<void> {
  try {
    const code = req.query.code as string;
    const stateStr = req.query.state as string | undefined;

    if (!code) {
      res.redirect(`${process.env.FRONTEND_REDIRECT_URI || 'http://localhost:5173'}/auth?error=missing_code`);
      return;
    }

    const state = oauthCallbackService.parseState(stateStr);
    const deviceInfo = getDeviceInfo(req);

    const { user, accessToken, refreshToken } = await oauthCallbackService.handleGoogleCallback(
      code,
      state,
      deviceInfo
    );

    setRefreshTokenCookie(res, refreshToken);
    const result = buildAuthResponse(user, accessToken, refreshToken);

    const frontendUri = process.env.FRONTEND_REDIRECT_URI || 'http://localhost:5173';
    const redirectUrl = new URL(`${frontendUri}/auth/callback`);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('user', JSON.stringify(result.user));

    res.redirect(redirectUrl.toString());
  } catch (err) {
    const frontendUri = process.env.FRONTEND_REDIRECT_URI || 'http://localhost:5173';
    const message = err instanceof Error ? err.message : 'OAuth failed';
    res.redirect(`${frontendUri}/auth?error=${encodeURIComponent(message)}`);
  }
}
