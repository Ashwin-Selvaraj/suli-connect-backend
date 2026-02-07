import { prisma } from '../../../prisma/client';
import type { UserRole } from '../../../common/types';
import type { AuthUserPayload } from '../dtos/auth-response.dto';
import type { ProfileSetupDto } from '../dtos/profile-setup.dto';
import type { UpdateProfileDto } from '../dtos/update-profile.dto';

/** Create user from phone (OTP signup) */
export async function createUserFromPhone(phone: string) {
  return prisma.user.create({
    data: {
      phone,
      name: `User ${phone.slice(-4)}`,
      role: 'WORKER',
      authProvider: 'phone',
    },
  });
}

/** Create user from Google profile */
export async function createUserFromGoogle(googleId: string, email: string | null, name: string, avatarUrl: string | null) {
  const user = await prisma.user.create({
    data: {
      email: email || `google_${googleId}@placeholder.local`,
      name: name || 'User',
      avatarUrl,
      role: 'WORKER',
      authProvider: 'google',
    },
  });
  await prisma.authProvider.create({
    data: { userId: user.id, provider: 'google', providerId: googleId },
  });
  return user;
}

/** Create user from wallet */
export async function createUserFromWallet(address: string) {
  const user = await prisma.user.create({
    data: {
      walletAddress: address.toLowerCase(),
      name: `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
      role: 'WORKER',
      authProvider: 'wallet',
    },
  });
  await prisma.authProvider.create({
    data: { userId: user.id, provider: 'wallet', providerId: address.toLowerCase() },
  });
  return user;
}

/** Complete profile setup after OAuth/Wallet signup */
export async function setupProfile(userId: string, dto: ProfileSetupDto) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: dto.name,
      role: dto.role as UserRole,
      domainId: dto.domainId ?? undefined,
      teamId: dto.teamId ?? undefined,
      reportingManagerId: dto.reportingManagerId ?? undefined,
    },
  });
}

/** Update profile */
export async function updateProfile(userId: string, dto: UpdateProfileDto) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      role: dto.role as UserRole | undefined,
      domainId: dto.domainId,
      teamId: dto.teamId,
      reportingManagerId: dto.reportingManagerId,
    },
  });
}

/** Convert user to auth payload */
export function toAuthPayload(user: { id: string; phone?: string | null; email?: string | null; walletAddress?: string | null; role: UserRole; domainId?: string | null; teamId?: string | null; reportingManagerId?: string | null }): AuthUserPayload {
  return {
    sub: user.id,
    phone: user.phone,
    email: user.email,
    walletAddress: user.walletAddress,
    role: user.role,
    domainId: user.domainId,
    teamId: user.teamId,
    reportingManagerId: user.reportingManagerId,
  };
}
