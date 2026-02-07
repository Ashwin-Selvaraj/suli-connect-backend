/**
 * Auth module - centralized auth pieces.
 * Exports routes, controllers, services, guards for use across the API.
 */

// Routes
export { default as authRoutes } from './auth.routes';

// Guards (re-export for convenience)
export { jwtAuthGuard } from '../../common/guards/jwt-auth.guard';
export { adminGuard } from '../../common/guards/admin.guard';
export { rolesGuard } from '../../common/guards/roles.guard';
export { globalAuthMiddleware } from '../../common/guards/global-auth.middleware';
export { isPublicRoute, PUBLIC_ROUTES } from '../../common/auth/public-routes';
