import { Router } from 'express';
import { authGuard } from '../../common/guards/auth';
import * as onboardingController from './onboarding.controller';

const router = Router();

router.use(authGuard);

// POST /api/onboarding - full multi-step onboarding
router.post('/', onboardingController.completeOnboarding);

export default router;
