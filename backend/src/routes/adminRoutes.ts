import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import { barberSchema, updateBarberSchema } from '../validation/schemas';

const router = Router();

// Staff (Barbers) Management
router.get('/barbers', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), adminController.getBarbers);
router.post('/barbers', authenticate, requireRole(['OWNER', 'ADMIN']), validateBody(barberSchema), adminController.createBarber);
router.put('/barbers/:id', authenticate, requireRole(['OWNER', 'ADMIN']), validateBody(updateBarberSchema), adminController.updateBarber);
router.delete('/barbers/:id', authenticate, requireRole(['OWNER', 'ADMIN']), adminController.deleteBarber);

// Customers Directory & Relationship Management
router.get('/customers', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), adminController.getCustomers);

export default router;
