import type { Request, Response } from 'express';
import { uuidParam } from '../../shared/validation.js';
import {
  createProductSchema,
  listProductsQuery,
  stockAdjustmentSchema,
  updateProductSchema,
} from './products.schemas.js';
import { productsService } from './products.service.js';

export const productsController = {
  async list(req: Request, res: Response) {
    const query = listProductsQuery.parse(req.query);
    res.json(await productsService.list(query));
  },

  async get(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    res.json({ data: await productsService.get(id) });
  },

  async create(req: Request, res: Response) {
    const input = createProductSchema.parse(req.body);
    res.status(201).json({ data: await productsService.create(input) });
  },

  async update(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    const input = updateProductSchema.parse(req.body);
    res.json({ data: await productsService.update(id, input) });
  },

  async remove(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    res.json({ data: await productsService.remove(id) });
  },

  async adjustStock(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    const { delta } = stockAdjustmentSchema.parse(req.body);
    res.json({ data: await productsService.adjustStock(id, delta) });
  },
};
