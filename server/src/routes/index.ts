import { Router } from 'express';
import healthRouter from './health';
import piRouter from './pi';
import applicationsRouter from './applications';

const router = Router();

router.use('/health', healthRouter);
router.use('/pi', piRouter);
router.use('/applications', applicationsRouter);

export default router;
