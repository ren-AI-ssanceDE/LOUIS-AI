import { Router } from 'express';
import emailRoutes from './email.ts';
import proxyRoutes from './proxy.ts';
import projectRoutes from './projects.ts';
import vectorRoutes from './vectors.ts';

const router = Router();

router.use('/', emailRoutes);
router.use('/proxy', proxyRoutes);
router.use('/', projectRoutes);
router.use('/vectors', vectorRoutes);

export default router;
