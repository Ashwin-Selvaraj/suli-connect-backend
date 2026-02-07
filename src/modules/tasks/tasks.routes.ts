import { Router } from 'express';
import * as tasksController from './tasks.controller';
import { requireRoles } from '../../common/guards/roles';

const router = Router();

// GET /tasks - List tasks
router.get('/', tasksController.list);

// GET /tasks/:id - Get task by ID
router.get('/:id', tasksController.getById);

// POST /tasks - Create task
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), tasksController.create);

// PATCH /tasks/:id - Update task
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), tasksController.update);

// POST /tasks/:id/assign - Assign users to task
router.post('/:id/assign', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), tasksController.assign);

// POST /tasks/:id/updates - Submit progress update
router.post('/:id/updates', tasksController.addUpdate);

// DELETE /tasks/:id - Soft delete
router.delete('/:id', requireRoles('SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD'), tasksController.softDelete);

export default router;
