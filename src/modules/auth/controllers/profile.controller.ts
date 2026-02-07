import { Request, Response } from 'express';
import { z } from 'zod';
import * as profileService from '../services/profile.service';
import { verifyAccessToken } from '../strategies/jwt.strategy';
import { profileSetupSchema } from '../dtos/profile-setup.dto';
import { updateProfileSchema } from '../dtos/update-profile.dto';

/** POST /auth/profile/setup - Profile setup after signup */
export async function setupProfile(req: Request, res: Response): Promise<void> {
  const payload = verifyAccessToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const body = profileSetupSchema.parse(req.body);
    const user = await profileService.setupProfile(payload.sub, body);
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Profile setup failed' });
  }
}

/** PATCH /auth/profile - Update profile */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const payload = verifyAccessToken(req);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await profileService.updateProfile(payload.sub, body);
    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Profile update failed' });
  }
}
