import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { orderRateLimit } from '../../middlewares/rate-limit.js';
import { ordersController } from './orders.controller.js';

/**
 * Listagem e detalhe são escopados por papel no serviço: administradores
 * veem todos os pedidos; estudantes, apenas os próprios.
 */
export const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.get('/', ordersController.list);
ordersRouter.post('/', authorize('STUDENT'), orderRateLimit, ordersController.create);
ordersRouter.get('/:id', ordersController.get);
// Admin: qualquer transição válida. Estudante: apenas cancelar enquanto "Recebido".
ordersRouter.patch('/:id/status', ordersController.updateStatus);
ordersRouter.patch('/:id/payment', authorize('ADMIN'), ordersController.updatePayment);
