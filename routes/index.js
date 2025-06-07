import express from 'express';
import authRoutes from './authRoute.js';
import repositoryRoutes from './repositoryRoute.js';
import paymentRoute from './paymentRoute.js';
import internalRoutes from './internalRoute.js';
import notificationRoute from './notificationRoute.js';

const router = express.Router();

// 인증 관련 라우트
router.use('/auth', authRoutes);

// 저장소 관련 라우트
router.use('/repositories', repositoryRoutes);

// 결제 및 구독 관련 라우트
router.use('/payment', paymentRoute);

// 내부 API 라우트 (Flask 콜백용)
router.use('/internal', internalRoutes);

// 알림 관련 라우트
router.use('/notification', notificationRoute);
export default router;
