import { Request, Response } from 'express';
import * as oauthCallbackService from '../services/oauth-callback.service';
import { setRefreshTokenCookie, setAccessTokenCookie } from '../services/cookie.service';
import { getDeviceInfo } from '../services/device-info.service';
import { buildAuthResponse } from '../services/auth.service';
import { authConfig } from '../config';

/** GET /webapp/auth/google/callback - OAuth callback */
export async function googleCallback(req: Request, res: Response): Promise<void> {
  const frontendUrl = authConfig.frontendUrl;

  try {
    const code = req.query.code as string;
    const stateStr = req.query.state as string | undefined;

    if (!code) {
      res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent('missing_code')}`);
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
    setAccessTokenCookie(res, accessToken);
    const result = buildAuthResponse(user, accessToken, refreshToken);

    const redirectUrl = new URL(`${frontendUrl}/auth/success`);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('user', JSON.stringify(result.user));

    res.redirect(redirectUrl.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth failed';
    res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(message)}`);
  }
}
