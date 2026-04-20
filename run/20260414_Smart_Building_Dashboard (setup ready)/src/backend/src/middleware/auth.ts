import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/logger';
import { sendError } from '../utils/apiResponse';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  buildingId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 401, 'TOKEN_EXPIRED', 'Access token has expired');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 401, 'INVALID_TOKEN', 'Invalid access token');
      return;
    }
    logger.error('Auth middleware error', { error });
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication failed');
  }
}
