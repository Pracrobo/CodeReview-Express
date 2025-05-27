import express from 'express';
import authRoutes from './authRoute.js';
import repositoryRoutes from './repositoryRoute.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/repositories', repositoryRoutes);

export default router;
