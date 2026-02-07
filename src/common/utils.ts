import type { PaginationParams, PaginatedResponse } from './types';

export function getPagination(params: PaginationParams): { skip: number; take: number } {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginate<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}
