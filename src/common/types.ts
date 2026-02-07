/** User roles - matches Prisma UserRole enum */
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DOMAIN_HEAD: 'DOMAIN_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  SENIOR_WORKER: 'SENIOR_WORKER',
  WORKER: 'WORKER',
  VOLUNTEER: 'VOLUNTEER',
  VISITOR: 'VISITOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Task statuses - matches Prisma TaskStatus enum */
export const TaskStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface AuthUser {
  id: string;
  phone?: string | null;
  role: UserRole;
  domainId?: string | null;
  teamId?: string | null;
  reportingManagerId?: string | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
