import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth-context.js';
import { uuidParam } from '../../shared/validation.js';
import {
  createCategorySchema,
  listCategoriesQuery,
  reorderCategoriesSchema,
  updateCategorySchema,
} from './categories.schemas.js';
import { categoriesService } from './categories.service.js';

export const categoriesController = {
  async list(req: Request, res: Response) {
    const { includeInactive } = listCategoriesQuery.parse(req.query);
    // Apenas administradores enxergam categorias inativas.
    const canSeeInactive = getAuth(req).role === 'ADMIN' && includeInactive === true;
    res.json({ data: await categoriesService.list(canSeeInactive) });
  },

  async create(req: Request, res: Response) {
    const input = createCategorySchema.parse(req.body);
    res.status(201).json({ data: await categoriesService.create(input) });
  },

  async update(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    res.json({ data: await categoriesService.update(id, input) });
  },

  async remove(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    await categoriesService.remove(id);
    res.status(204).end();
  },

  async reorder(req: Request, res: Response) {
    const { ids } = reorderCategoriesSchema.parse(req.body);
    res.json({ data: await categoriesService.reorder(ids) });
  },
};
