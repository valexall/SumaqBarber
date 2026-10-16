import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Staff (Barbers) Management
router.get('/barbers', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), adminController.getBarbers);
router.post('/barbers', authenticate, requireRole(['OWNER', 'ADMIN', 'BARBER']), adminController.createBarber);
router.put('/barbers/:id', authenticate, requireRole(['OWNER', 'ADMIN']), adminController.updateBarber);
router.delete('/barbers/:id', authenticate, requireRole(['OWNER', 'ADMIN']), adminController.deleteBarber);

// Customers Directory & Relationship Management
router.get('/customers', authenticate, requireRole(['BARBER', 'OWNER', 'ADMIN']), adminController.getCustomers);

export default router;
