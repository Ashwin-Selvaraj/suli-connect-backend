import { prisma } from '../../../prisma/client';

/** Find user by Google provider ID */
export async function findUserByGoogleId(googleId: string) {
  const provider = await prisma.authProvider.findFirst({
    where: { provider: 'google', providerId: googleId },
    include: { user: true },
  });
  return provider?.user ?? null;
}

/** Link Google provider to existing user */
export async function linkGoogleToUser(userId: string, googleId: string, accessToken?: string) {
  return prisma.authProvider.upsert({
    where: {
      provider_providerId: { provider: 'google', providerId: googleId },
    },
    create: {
      userId,
      provider: 'google',
      providerId: googleId,
      accessToken: accessToken ?? undefined,
    },
    update: { accessToken: accessToken ?? undefined },
  });
}

/** Find user by wallet address */
export async function findUserByWallet(address: string) {
  return prisma.user.findFirst({
    where: { walletAddress: address.toLowerCase() },
  });
}
