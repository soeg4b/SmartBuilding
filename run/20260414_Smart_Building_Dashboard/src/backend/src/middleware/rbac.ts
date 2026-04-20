import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

type Role = 'financial_decision_maker' | 'sys_admin' | 'technician';

/**
 * Role-based access control middleware factory.
 * Pass the allowed roles for the route. If the user's role is not
 * in the list, responds with 403 Forbidden.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      sendError(
        res,
        403,
        'FORBIDDEN',
        `Access denied. Required role(s): ${allowedRoles.join(', ')}`
      );
      return;
    }

    next();
  };
}
