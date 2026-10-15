import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', appointmentController.createAppointment);
router.get('/', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getAppointments);
router.get('/my-appointments', authenticate, appointmentController.getMyAppointments);
router.get('/barber', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getBarberAppointments);
router.get('/barber/stats', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getBarberStats);
router.patch('/:id/status', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.updateAppointmentStatus);
router.patch('/:id/cancel', authenticate, appointmentController.cancelAppointment);

export default router;

