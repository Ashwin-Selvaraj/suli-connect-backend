import { prisma } from '../../../prisma/client';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../../../common/types';
import * as tokenService from './token.service';
import * as sessionService from './session.service';
import * as profileService from './profile.service';
import * as phoneOtpService from '../strategies/phone-otp.service';
import type { AuthResponse, AuthUserResponse } from '../dtos/auth-response.dto';

/** User payload for JWT and API responses */
export interface AuthUserPayload {
  sub: string;
  phone?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  role: UserRole;
  domainId?: string | null;
  teamId?: string | null;
  reportingManagerId?: string | null;
}

/** Build AuthResponse { token, user } */
export function buildAuthResponse(
  user: { id: string; phone?: string | null; email?: string | null; walletAddress?: string | null; name: string; avatarUrl?: string | null; role: UserRole; domainId?: string | null; teamId?: string | null; reportingManagerId?: string | null; reputationScore?: number },
  accessToken: string,
  refreshToken: string
): AuthResponse {
  const authUser: AuthUserResponse = {
    id: user.id,
    phone: user.phone,
    email: user.email,
    walletAddress: user.walletAddress,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    domainId: user.domainId,
    teamId: user.teamId,
    reportingManagerId: user.reportingManagerId,
    reputationScore: user.reputationScore ?? 0,
  };
  return {
    token: { accessToken, refreshToken },
    user: authUser,
  };
}

/** Login with phone + password (legacy / admin) */
export async function loginWithPassword(
  phone: string,
  password: string,
  deviceInfo?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResponse> {
  const user = await prisma.user.findFirst({
    where: { phone, isActive: true, deletedAt: null },
  });
  if (!user?.passwordHash) throw new Error('Invalid phone or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid phone or password');

  const payload: AuthUserPayload = {
    sub: user.id,
    phone: user.phone,
    email: user.email,
    walletAddress: user.walletAddress,
    role: user.role,
    domainId: user.domainId,
    teamId: user.teamId,
    reportingManagerId: user.reportingManagerId,
  };

  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken(user.id);
  await sessionService.createSession(user.id, refreshToken, deviceInfo);

  return buildAuthResponse(user, accessToken, refreshToken);
}

/** OTP request - generate and store OTP (pluggable send) */
export async function requestOtp(phone: string): Promise<void> {
  const otp = await phoneOtpService.generateAndStoreOtp(phone);
  // Pluggable: send OTP via SMS - console log for dev only
  if (process.env.NODE_ENV === 'development') {
    console.log(`[OTP] ${phone}: ${otp}`);
  }
}

/** OTP verify - validate, create/find user, create session */
export async function verifyOtp(
  phone: string,
  otp: string,
  deviceInfo?: { userAgent?: string; ipAddress?: string }
): Promise<AuthResponse> {
  const valid = await phoneOtpService.verifyOtp(phone, otp);
  if (!valid) throw new Error('Invalid or expired OTP');

  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    user = await profileService.createUserFromPhone(phone);
  }
  if (!user.isActive || user.deletedAt) throw new Error('Account disabled');

  const payload = profileService.toAuthPayload(user);
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken(user.id);
  await sessionService.createSession(user.id, refreshToken, deviceInfo);

  return buildAuthResponse(user, accessToken, refreshToken);
}
