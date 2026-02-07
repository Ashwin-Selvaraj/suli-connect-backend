import type { UserRole } from '@prisma/client';

/**
 * Role hierarchy level (higher = more authority).
 * Used to enforce "cannot assign tasks upward" rule.
 */
export const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  DOMAIN_HEAD: 70,
  TEAM_LEAD: 60,
  SENIOR_WORKER: 50,
  WORKER: 40,
  VOLUNTEER: 30,
  VISITOR: 10,
};

/**
 * Check if actor can manage target (actor must be higher or equal in hierarchy).
 * SUPER_ADMIN and ADMIN can manage anyone.
 */
export function canManage(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN') return true;
  return ROLE_LEVEL[actorRole] >= ROLE_LEVEL[targetRole];
}

/**
 * Check if actor can verify tasks for target (validator must be higher).
 * Cannot verify own task.
 */
export function canVerify(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN') return true;
  return ROLE_LEVEL[actorRole] > ROLE_LEVEL[targetRole];
}

/**
 * Roles that can act as validators (higher in hierarchy than workers).
 */
export const VALIDATOR_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'DOMAIN_HEAD',
  'TEAM_LEAD',
  'SENIOR_WORKER',
];
