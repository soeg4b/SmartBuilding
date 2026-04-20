import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Send a standardized success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): void {
  const response: ApiSuccessResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  res.status(statusCode).json(response);
}

/**
 * Send a standardized error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send a 204 No Content response.
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}
