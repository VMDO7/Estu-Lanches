import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { menuService } from './menu.service.js';

export const menuRouter = Router();

menuRouter.get('/', authenticate, async (_req, res) => {
  res.json({ data: await menuService.getMenu() });
});
