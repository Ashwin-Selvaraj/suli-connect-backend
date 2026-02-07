import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';
import type { AuthUser } from '../../common/types';

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

const otpRequestSchema = z.object({
  phone: z.string().min(10),
});

const otpVerifySchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
});

/**
 * Basic login: phone + password.
 * Returns user ID as token (stub - replace with JWT).
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { phone: body.phone, isActive: true, deletedAt: null },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    // Stub: return user ID as token. Replace with JWT.
    const authUser: AuthUser = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      domainId: user.domainId,
      teamId: user.teamId,
      reportingManagerId: user.reportingManagerId,
    };

    res.json({
      token: user.id,
      user: authUser,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * Request OTP (stub). In production, send SMS.
 */
export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const body = otpRequestSchema.parse(req.body);
    // Stub: always succeed. In production, generate OTP, store, send SMS.
    res.json({
      message: 'OTP sent (stub)',
      phone: body.phone,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'OTP request failed' });
  }
}

/**
 * Verify OTP and return token (stub). Accepts any 6-digit OTP.
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const body = otpVerifySchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { phone: body.phone, isActive: true, deletedAt: null },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Stub: accept any 6-digit OTP. In production, verify against stored OTP.
    if (body.otp.length !== 6) {
      res.status(401).json({ error: 'Invalid OTP' });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      domainId: user.domainId,
      teamId: user.teamId,
      reportingManagerId: user.reportingManagerId,
    };

    res.json({
      token: user.id,
      user: authUser,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'OTP verification failed' });
  }
}
