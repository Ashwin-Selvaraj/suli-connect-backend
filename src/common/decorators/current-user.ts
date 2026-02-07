/**
 * In Express, req.user is set by jwtAuthGuard.
 * Use req.user in controllers for current user payload.
 *
 * Type for current user:
 */
import type { AuthUser } from '../types';

export type CurrentUserPayload = AuthUser;
