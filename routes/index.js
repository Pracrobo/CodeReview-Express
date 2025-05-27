import express from 'express';
import authRoutes from './authRoute.js';
import repositoryRoutes from './repositoryRoute.js';
import paymentRoute from './paymentRoute.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/repositories', repositoryRoutes);
router.use('/payment', paymentRoute);

export default router;
