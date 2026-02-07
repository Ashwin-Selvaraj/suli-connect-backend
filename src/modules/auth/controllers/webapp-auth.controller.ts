import { Request, Response } from 'express';
import * as googleService from '../strategies/google.service';
import * as oauthCallbackService from '../services/oauth-callback.service';
import { setRefreshTokenCookie } from '../services/cookie.service';
import { getDeviceInfo } from '../services/device-info.service';
import { buildAuthResponse } from '../services/auth.service';

/** GET /webapp/auth?provider=google&type=user - Start OAuth redirect */
export async function startOAuth(req: Request, res: Response): Promise<void> {
  const provider = req.query.provider as string;
  const type = (req.query.type as string) || 'user';
  const referral = req.query.referral as string | undefined;
  const userId = req.query.userId as string | undefined;

  if (provider !== 'google') {
    res.status(400).json({ error: 'Unsupported provider' });
    return;
  }

  const state = oauthCallbackService.encodeState({
    type: type === 'link' ? 'link' : 'login',
    referral,
    userId: type === 'link' ? userId : undefined,
  });

  const url = googleService.buildAuthUrl(state);
  res.redirect(url);
}
