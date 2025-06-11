import express from 'express';
import authRoute from './authRoute.js';
import repositoryRoute from './repositoryRoute.js';
import paymentRoute from './paymentRoute.js';
import internalRoute from './internalRoute.js';
import chatbotRoute from './chatbotRoute.js';
import notificationRoute from './notificationRoute.js';
import issueRoute from './issueRoute.js';

const router = express.Router();

// 인증 관련 라우트
router.use('/auth', authRoute);

// 저장소 관련 라우트
router.use('/repositories', repositoryRoute);

// 결제 및 구독 관련 라우트
router.use('/payment', paymentRoute);

// 내부 API 라우트 (Flask 콜백용)
router.use('/internal', internalRoute);

// 챗봇 대화 및 메시지 관련 라우트
router.use('/chatbot', chatbotRoute);

// 알림 관련 라우트
router.use('/notification', notificationRoute);

// 이슈 관련 라우트
router.use('/issues', issueRoute);

export default router;
