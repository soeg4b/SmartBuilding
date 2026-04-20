import { Request } from 'express';
import { PaginationMeta } from './apiResponse';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parse pagination params from the request query string.
 * Defaults: page=1, limit=20, max limit=100.
 */
export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata from total count & current params.
 */
export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
