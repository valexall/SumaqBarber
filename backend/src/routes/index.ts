import { Router } from 'express';
import authRoutes from './authRoutes';
import serviceRoutes from './serviceRoutes';
import appointmentRoutes from './appointmentRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
