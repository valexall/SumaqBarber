import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', appointmentController.createAppointment);
router.get('/', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getAppointments);
router.get('/my-appointments', authenticate, appointmentController.getMyAppointments);
router.patch('/:id/cancel', authenticate, appointmentController.cancelAppointment);

export default router;

