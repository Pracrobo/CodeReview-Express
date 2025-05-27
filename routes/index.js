import express from 'express';
import authRoutes from './auth.js';
import repositoryRoutes from './repositories.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/repositories', repositoryRoutes);

export default router;
