import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { loginRateLimit, refreshRateLimit, registerRateLimit } from '../../middlewares/rate-limit.js';
import { requireTrustedOrigin } from '../../middlewares/trusted-origin.js';
import { authController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', registerRateLimit, authController.register);
authRouter.post('/login', loginRateLimit, authController.login);
authRouter.post('/refresh', requireTrustedOrigin, refreshRateLimit, authController.refresh);
authRouter.post('/logout', requireTrustedOrigin, authController.logout);
authRouter.get('/me', authenticate, authController.me);
