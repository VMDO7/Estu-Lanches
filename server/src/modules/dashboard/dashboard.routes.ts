import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { dashboardService } from './dashboard.service.js';

const periodDays = (fallback: '7' | '30' | '90') =>
  z.enum(['7', '30', '90']).default(fallback).transform(Number);

const salesQuery = z.object({ days: periodDays('7') });
const topProductsQuery = z.object({
  days: periodDays('30'),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});
const byHourQuery = z.object({ days: periodDays('30') });

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize('ADMIN'));

dashboardRouter.get('/summary', async (_req, res) => {
  res.json({ data: await dashboardService.summary() });
});

dashboardRouter.get('/sales', async (req, res) => {
  const { days } = salesQuery.parse(req.query);
  res.json({ data: await dashboardService.salesSeries(days) });
});

dashboardRouter.get('/top-products', async (req, res) => {
  const { days, limit } = topProductsQuery.parse(req.query);
  res.json({ data: await dashboardService.topProducts(days, limit) });
});

dashboardRouter.get('/sales-by-hour', async (req, res) => {
  const { days } = byHourQuery.parse(req.query);
  res.json({ data: await dashboardService.salesByHour(days) });
});
