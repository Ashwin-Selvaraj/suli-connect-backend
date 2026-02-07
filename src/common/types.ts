import type { UserRole } from '@prisma/client';

export { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  domainId: string | null;
  teamId: string | null;
  reportingManagerId: string | null;
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
