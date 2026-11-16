import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { categoriesController } from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', categoriesController.list);
categoriesRouter.post('/', authorize('ADMIN'), categoriesController.create);
categoriesRouter.put('/order', authorize('ADMIN'), categoriesController.reorder);
categoriesRouter.patch('/:id', authorize('ADMIN'), categoriesController.update);
categoriesRouter.delete('/:id', authorize('ADMIN'), categoriesController.remove);
