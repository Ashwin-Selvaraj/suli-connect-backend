import { Router } from 'express';
import * as authMainController from './controllers/auth-main.controller';
import * as webappAuthController from './controllers/webapp-auth.controller';
import * as webappLinkController from './controllers/webapp-link.controller';
import * as sessionController from './controllers/session.controller';
import * as profileController from './controllers/profile.controller';

const router = Router();

// ============================================================================
// WEBAPP OAUTH (redirect flow)
// ============================================================================

// GET /api/auth/webapp/auth?provider=google&type=user - Start OAuth
router.get('/webapp/auth', webappAuthController.startOAuth);

// GET /api/auth/webapp/auth/google/callback - OAuth callback
router.get('/webapp/auth/google/callback', webappLinkController.googleCallback);

// ============================================================================
// AUTH MAIN (phone, wallet, Google code exchange, refresh)
// ============================================================================

// POST /api/auth/login - Phone + password (legacy)
router.post('/login', authMainController.login);

// POST /api/auth/otp/request
router.post('/otp/request', authMainController.otpRequest);

// POST /api/auth/otp/verify
router.post('/otp/verify', authMainController.otpVerify);

// POST /api/auth/wallet/request
router.post('/wallet/request', authMainController.walletRequest);

// POST /api/auth/wallet/verify
router.post('/wallet/verify', authMainController.walletVerify);

// POST /api/auth/google - Direct code exchange (mobile / webview)
router.post('/google', authMainController.googleCodeExchange);

// POST /api/auth/refresh
router.post('/refresh', authMainController.refresh);

// ============================================================================
// SESSION & PROFILE (require JWT)
// ============================================================================

// POST /api/auth/logout
router.post('/logout', sessionController.logout);

// GET /api/auth/sessions
router.get('/sessions', sessionController.listSessions);

// POST /api/auth/profile/setup
router.post('/profile/setup', profileController.setupProfile);

// PATCH /api/auth/profile
router.patch('/profile', profileController.updateProfile);

export default router;
