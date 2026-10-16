import { Router } from 'express';
import authRoutes from './authRoutes';
import serviceRoutes from './serviceRoutes';
import appointmentRoutes from './appointmentRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/admin', adminRoutes);

export default router;
