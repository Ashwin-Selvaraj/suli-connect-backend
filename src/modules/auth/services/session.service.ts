import { prisma } from '../../../prisma/client';
import * as tokenService from './token.service';
import type { DeviceInfo } from '../dtos/device-info.dto';

/** Create session and store hashed refresh token */
export async function createSession(
  userId: string,
  refreshToken: string,
  deviceInfo?: Partial<DeviceInfo>
): Promise<string> {
  const hash = tokenService.hashRefreshToken(refreshToken);
  const expiresInDays = 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const session = await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: hash,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      userAgent: deviceInfo?.userAgent ?? null,
      ipAddress: deviceInfo?.ipAddress ?? null,
      expiresAt,
    },
  });
  return session.id;
}

/** Validate refresh token against stored session */
export async function validateRefreshToken(refreshToken: string): Promise<{ userId: string; sessionId: string } | null> {
  const { userId } = tokenService.verifyRefreshToken(refreshToken);
  const hash = tokenService.hashRefreshToken(refreshToken);

  const session = await prisma.authSession.findFirst({
    where: {
      userId,
      refreshTokenHash: hash,
      expiresAt: { gt: new Date() },
    },
  });
  if (!session) return null;
  return { userId, sessionId: session.id };
}

/** Revoke session (logout) */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

/** List sessions for user */
export async function listSessions(userId: string) {
  return prisma.authSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Revoke all sessions for user */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { userId } });
}
