import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 결제 실패 처리
router.post('/fail', authenticate, paymentController.paymentFail);

// 결제 성공(완료) 처리
router.post('/complete', authenticate, paymentController.paymentComplete);

// 결제/구독 상태 조회
router.get('/status', authenticate, paymentController.getPaymentStatus);

export default router;