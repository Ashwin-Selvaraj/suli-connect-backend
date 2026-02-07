import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as walletValidator from '../strategies/wallet.validator';
import * as profileService from '../services/profile.service';
import * as tokenService from '../services/token.service';
import * as sessionService from '../services/session.service';
import * as googleService from '../strategies/google.service';
import * as oauthCallbackService from '../services/oauth-callback.service';
import * as providerService from '../services/provider.service';
import { getDeviceInfo } from '../services/device-info.service';
import { phoneOtpRequestSchema } from '../dtos/phone-otp-request.dto';
import { phoneOtpVerifySchema as verifySchema } from '../dtos/phone-otp-verify.dto';
import { walletRequestSchema } from '../dtos/wallet-request.dto';
import { walletVerifySchema } from '../dtos/wallet-verify.dto';
import { googleCodeSchema } from '../dtos/google-code.dto';
import { refreshTokenSchema } from '../dtos/refresh-token.dto';
import { loginSchema } from '../dtos/login.dto';

/** POST /auth/login - Phone + password (legacy) */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const deviceInfo = getDeviceInfo(req);
    const result = await authService.loginWithPassword(body.phone, body.password, deviceInfo);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
}

/** POST /auth/otp/request */
export async function otpRequest(req: Request, res: Response): Promise<void> {
  try {
    const body = phoneOtpRequestSchema.parse(req.body);
    await authService.requestOtp(body.phone);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'OTP request failed' });
  }
}

/** POST /auth/otp/verify */
export async function otpVerify(req: Request, res: Response): Promise<void> {
  try {
    const body = verifySchema.parse(req.body);
    const deviceInfo = getDeviceInfo(req);
    const result = await authService.verifyOtp(body.phone, body.otp, deviceInfo);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid OTP' });
  }
}

/** POST /auth/wallet/request */
export async function walletRequest(req: Request, res: Response): Promise<void> {
  try {
    const body = walletRequestSchema.parse(req.body);
    const nonce = await walletValidator.generateNonce(body.address);
    const message = walletValidator.getMessageToSign(nonce);
    res.json({ message, nonce });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Wallet request failed' });
  }
}

/** POST /auth/wallet/verify */
export async function walletVerify(req: Request, res: Response): Promise<void> {
  try {
    const body = walletVerifySchema.parse(req.body);
    const valid = await walletValidator.verifySignature(body.address, body.signature);
    if (!valid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    let user = await providerService.findUserByWallet(body.address);
    if (!user) {
      user = await profileService.createUserFromWallet(body.address);
    }
    if (!user.isActive || user.deletedAt) {
      res.status(403).json({ error: 'Account disabled' });
      return;
    }

    const deviceInfo = getDeviceInfo(req);
    const payload = profileService.toAuthPayload(user);
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken(user.id);
    await sessionService.createSession(user.id, refreshToken, deviceInfo);

    const result = authService.buildAuthResponse(user, accessToken, refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(401).json({ error: err instanceof Error ? err.message : 'Verification failed' });
  }
}

/** POST /auth/google - Direct code exchange (mobile / webview) */
export async function googleCodeExchange(req: Request, res: Response): Promise<void> {
  try {
    const body = googleCodeSchema.parse(req.body);
    const deviceInfo = getDeviceInfo(req);
    const { user: authUser, accessToken, refreshToken } = await oauthCallbackService.handleGoogleCallback(
      body.code,
      { type: 'login' },
      deviceInfo
    );
    const result = authService.buildAuthResponse(authUser, accessToken, refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(401).json({ error: err instanceof Error ? err.message : 'Google auth failed' });
  }
}

/** POST /auth/refresh */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const validated = await sessionService.validateRefreshToken(body.refreshToken);
    if (!validated) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const { prisma } = await import('../../../prisma/client');
    const user = await prisma.user.findUnique({ where: { id: validated.userId } });
    if (!user || !user.isActive || user.deletedAt) {
      res.status(401).json({ error: 'User not found or disabled' });
      return;
    }

    const payload = profileService.toAuthPayload(user);
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken(user.id);
    await sessionService.revokeSession(validated.sessionId);
    await sessionService.createSession(user.id, refreshToken, getDeviceInfo(req));

    const result = authService.buildAuthResponse(user, accessToken, refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(401).json({ error: 'Refresh failed' });
  }
}
