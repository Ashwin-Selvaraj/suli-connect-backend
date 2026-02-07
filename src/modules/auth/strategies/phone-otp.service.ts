import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../prisma/client';
import { authConfig } from '../config';

const OTP_EXPIRY_MS = authConfig.otp.expiryMinutes * 60 * 1000;

/** Generate 6-digit OTP */
function generateOtp(): string {
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return otp;
}

/** Hash OTP for storage */
async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/** Generate OTP, store hashed + expiry. Returns raw OTP for dev logging only. */
export async function generateAndStoreOtp(phone: string): Promise<string> {
  const otp = generateOtp();
  const hashedOtp = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.authOtp.deleteMany({ where: { phone } });
  await prisma.authOtp.create({
    data: { phone, hashedOtp, expiresAt },
  });

  return otp;
}

/** Get last OTP for phone - ONLY for dev logging, returns empty in prod (OTP is hashed) */
export function getLastOtpForPhone(_phone: string): string | null {
  // OTP is hashed - we cannot retrieve it. Return null.
  // Dev logging should happen in generateAndStoreOtp's caller.
  return null;
}

/** Verify OTP - returns true if valid */
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const record = await prisma.authOtp.findFirst({
    where: { phone, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;

  const valid = await bcrypt.compare(otp, record.hashedOtp);
  if (valid) {
    await prisma.authOtp.deleteMany({ where: { phone } });
  }
  return valid;
}
