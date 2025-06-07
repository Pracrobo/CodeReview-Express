import express from 'express';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// 알림 SSE 스트림 연결
router.get('/stream', notificationController.initializeSseConnection);

export default router;
