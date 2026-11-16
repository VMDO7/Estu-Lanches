import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { studentsRouter } from './modules/students/students.routes.js';
import { metaRouter } from './modules/system/system.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';

/** API REST versionada — montada em /api/v1. */
export const apiRouter = Router();

apiRouter.use('/meta', metaRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/menu', menuRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/students', studentsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/uploads', uploadsRouter);
