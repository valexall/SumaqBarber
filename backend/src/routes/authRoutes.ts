import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { createRateLimiter } from '../middlewares/security';
import { loginSchema, profileSchema, registerSchema } from '../validation/schemas';

const router = Router();

const authLimiter = createRateLimiter(15 * 60 * 1000, 20);

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, validateBody(profileSchema), authController.updateMe);

export default router;
