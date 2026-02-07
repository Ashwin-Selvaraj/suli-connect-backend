import { Router } from 'express';
import * as domainsController from './domains.controller';
import { requireRoles } from '../../common/guards/roles';

const router = Router();

// GET /domains - List domains
router.get('/', domainsController.list);

// GET /domains/:id - Get domain by ID
router.get('/:id', domainsController.getById);

// POST /domains - Create domain (admin only)
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), domainsController.create);

// PATCH /domains/:id - Update domain
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), domainsController.update);

export default router;
