import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/apiResponse';
import { buildPaginationMeta } from '../../utils/pagination';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, role, buildingId, search } = req.query as any;

    const result = await usersService.list({ page, limit, role, buildingId, search });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.users, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getById(req.params.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.create(req.body);
    sendSuccess(res, user, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.update(req.params.id, req.body);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateStatus(req.params.id, req.body.isActive);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}
