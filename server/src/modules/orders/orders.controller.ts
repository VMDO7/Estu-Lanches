import type { Request, Response } from 'express';
import { getAuth } from '../../shared/auth-context.js';
import { uuidParam } from '../../shared/validation.js';
import {
  createOrderSchema,
  idempotencyKeySchema,
  listOrdersQuery,
  updateOrderStatusSchema,
  updatePaymentSchema,
} from './orders.schemas.js';
import { ordersService } from './orders.service.js';

export const ordersController = {
  async list(req: Request, res: Response) {
    const query = listOrdersQuery.parse(req.query);
    res.json(await ordersService.list(getAuth(req), query));
  },

  async get(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    res.json({ data: await ordersService.get(getAuth(req), id) });
  },

  async create(req: Request, res: Response) {
    const input = createOrderSchema.parse(req.body);
    const idempotencyKey = idempotencyKeySchema.parse(req.get('idempotency-key'));
    const { order, replayed } = await ordersService.create(getAuth(req), input, idempotencyKey);

    if (replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(replayed ? 200 : 201).json({ data: order });
  },

  async updateStatus(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    const input = updateOrderStatusSchema.parse(req.body);
    res.json({ data: await ordersService.updateStatus(getAuth(req), id, input) });
  },

  async updatePayment(req: Request, res: Response) {
    const { id } = uuidParam.parse(req.params);
    const input = updatePaymentSchema.parse(req.body);
    res.json({ data: await ordersService.updatePayment(getAuth(req), id, input) });
  },
};
