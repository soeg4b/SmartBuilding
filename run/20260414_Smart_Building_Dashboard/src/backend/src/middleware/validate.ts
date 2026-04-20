import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

interface ValidationTarget {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Zod validation middleware factory.
 * Validates request body, query params, and/or route params against
 * provided Zod schemas. Replaces the original values with parsed
 * (coerced/transformed) values on success.
 */
export function validate(schemas: ValidationTarget) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'body'));
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'query'));
      } else {
        (req as any).query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'params'));
      } else {
        req.params = result.data;
      }
    }

    if (errors.length > 0) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', errors);
      return;
    }

    next();
  };
}

function formatZodErrors(
  error: ZodError,
  source: string
): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: `${source}.${issue.path.join('.')}`,
    message: issue.message,
  }));
}
