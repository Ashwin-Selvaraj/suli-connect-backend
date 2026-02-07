import { Router } from 'express';
import * as authController from './auth.controller';

const router = Router();

// POST /auth/login - Basic login (phone + password or OTP stub)
router.post('/login', authController.login);

// POST /auth/otp/request - Request OTP (stub)
router.post('/otp/request', authController.requestOtp);

// POST /auth/otp/verify - Verify OTP and get token (stub)
router.post('/otp/verify', authController.verifyOtp);

export default router;
