import { Router } from 'express';
import * as serviceController from '../controllers/serviceController';

const router = Router();

router.get('/', serviceController.getServices);
router.get('/barbers', serviceController.getBarbers);

export default router;
