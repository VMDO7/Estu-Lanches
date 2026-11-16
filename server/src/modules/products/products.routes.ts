import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { productsController } from './products.controller.js';

/** Gestão do catálogo — exclusiva de administradores. */
export const productsRouter = Router();

productsRouter.use(authenticate, authorize('ADMIN'));

productsRouter.get('/', productsController.list);
productsRouter.post('/', productsController.create);
productsRouter.get('/:id', productsController.get);
productsRouter.patch('/:id', productsController.update);
productsRouter.delete('/:id', productsController.remove);
productsRouter.post('/:id/stock-adjustments', productsController.adjustStock);
