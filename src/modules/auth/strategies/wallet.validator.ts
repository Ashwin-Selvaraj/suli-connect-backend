import { ethers } from 'ethers';
import { prisma } from '../../../prisma/client';
import crypto from 'crypto';
import { authConfig } from '../config';

const MESSAGE_PREFIX = 'Sign this message to authenticate with Suli:\nNonce: ';

/** Generate nonce for wallet auth */
export async function generateNonce(address: string): Promise<string> {
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + authConfig.nonce.expiryMinutes * 60 * 1000);

  await prisma.authWalletNonce.upsert({
    where: { address: address.toLowerCase() },
    create: { address: address.toLowerCase(), nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  return nonce;
}

/** Verify wallet signature and return true if valid */
export async function verifySignature(address: string, signature: string): Promise<boolean> {
  const record = await prisma.authWalletNonce.findUnique({
    where: { address: address.toLowerCase() },
  });
  if (!record || record.expiresAt < new Date()) return false;

  const message = MESSAGE_PREFIX + record.nonce;
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    return false;
  }
  if (!recovered) return false;

  const isValid = recovered.toLowerCase() === address.toLowerCase();
  if (isValid) {
    await prisma.authWalletNonce.delete({ where: { address: address.toLowerCase() } });
  }
  return isValid;
}

/** Get message to sign for wallet auth */
export function getMessageToSign(nonce: string): string {
  return MESSAGE_PREFIX + nonce;
}
