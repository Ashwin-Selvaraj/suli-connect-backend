import { Router } from 'express';
import * as onboardingController from './onboarding.controller';

const router = Router();

// POST /api/onboarding - full multi-step onboarding (protected by global auth)
router.post('/', onboardingController.completeOnboarding);

export default router;
