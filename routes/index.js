import express from 'express';
import authRoutes from './authRoute.js';
import repositoryRoutes from './repositoryRoute.js';
import paymentRoute from './paymentRoute.js';

const router = express.Router();

// 인증 관련 라우트
router.use('/auth', authRoutes);

// 저장소 관련 라우트
router.use('/repositories', repositoryRoutes);

// 결제 및 구독 관련 라우트
router.use('/payment', paymentRoute);

export default router;
