import { Router } from 'express';
import * as appointmentController from '../controllers/appointmentController';
import { authenticate, optionalAuthenticate, requireRole } from '../middlewares/authMiddleware';
import { validateBody, validateQuery } from '../middlewares/validate';
import { createRateLimiter } from '../middlewares/security';
import { appointmentStatusSchema, availabilityQuerySchema, bookingSchema } from '../validation/schemas';

const router = Router();

router.post('/', createRateLimiter(60 * 60 * 1000, 12), optionalAuthenticate, validateBody(bookingSchema), appointmentController.createAppointment);
router.get('/availability', validateQuery(availabilityQuerySchema), appointmentController.getAvailability);
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN']), appointmentController.getAppointments);
router.get('/my-appointments', authenticate, appointmentController.getMyAppointments);
router.get('/barber', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getBarberAppointments);
router.get('/barber/stats', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), appointmentController.getBarberStats);
router.patch('/:id/status', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), validateBody(appointmentStatusSchema), appointmentController.updateAppointmentStatus);
router.patch('/:id/cancel', authenticate, appointmentController.cancelAppointment);

export default router;

