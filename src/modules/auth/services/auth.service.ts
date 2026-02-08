import { prisma } from '../../../prisma/client';
import bcrypt from 'bcryptjs';
import type { UserRole } from '../../../common/types';
import * as tokenService from './token.service';
import * as sessionService from './session.service';
import { createUserFromPhone, toAuthPayload } from '../services/profile.service';
import * as phoneOtpService from '../strategies/phone-otp.service';
import { toAuthUserResponse } from './auth-user-response.service';
import type { AuthResponse, AuthUserPayload } from '../dtos/auth-response.dto';

export type { AuthUserPayload };

const fullUserSelect = {
  id: true,
  phone: true,
  email: true,
  name: true,
  fullName: true,
  username: true,
  avatarUrl: true,
  profileImageUrl: true,
  role: true,
  isActive: true,
  onboardingCompleted: true,
  reputationScore: true,
  tasksCompletedCount: true,
  daysWorkedCount: true,
  team: { select: { name: true } },
  reportingManager: { select: { name: true } },
} as const;

/** Build AuthResponse { token, user } */
export async function buildAuthResponse(
  user: { id: string },
  accessToken: string,
  refreshToken: string
): Promise<AuthResponse> {
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: fullUserSelect,
  });
  if (!fullUser) throw new Error('User not found');

  return {
    token: { accessToken, refreshToken },
    user: toAuthUserResponse(fullUser, { refreshToken }),
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

  return await buildAuthResponse(user, accessToken, refreshToken);
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
    user = await createUserFromPhone(phone);
  }
  if (!user.isActive || user.deletedAt) throw new Error('Account disabled');

  const payload = toAuthPayload(user);
  const accessToken = tokenService.generateAccessToken(payload);
  const refreshToken = tokenService.generateRefreshToken(user.id);
  await sessionService.createSession(user.id, refreshToken, deviceInfo);

  return await buildAuthResponse(user, accessToken, refreshToken);
}
