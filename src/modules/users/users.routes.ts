import { Router } from 'express';
import * as usersController from './users.controller';
import { requireRoles, requireAdmin } from '../../common/guards/roles';

const router = Router();

// GET /users (protected by global auth) - List users (filtered by hierarchy)
router.get('/', usersController.list);

// GET /users/me - Current user profile
router.get('/me', usersController.me);

// GET /users/:id - Get user by ID
router.get('/:id', usersController.getById);

// POST /users - Create user (admin/domain head/team lead)
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), usersController.create);

// PATCH /users/:id - Update user
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), usersController.update);

// PATCH /users/:id/deactivate - Soft deactivate (admin only for hard cases)
router.patch('/:id/deactivate', requireAdmin, usersController.deactivate);

export default router;
