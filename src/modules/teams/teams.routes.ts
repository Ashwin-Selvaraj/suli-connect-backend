import { Router } from 'express';
import * as teamsController from './teams.controller';
import { authGuard } from '../../common/guards/auth';
import { requireRoles } from '../../common/guards/roles';

const router = Router();

router.use(authGuard);

// GET /teams - List teams (optionally by domainId)
router.get('/', teamsController.list);

// GET /teams/:id - Get team by ID
router.get('/:id', teamsController.getById);

// POST /teams - Create team
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD'), teamsController.create);

// PATCH /teams/:id - Update team
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), teamsController.update);

export default router;
