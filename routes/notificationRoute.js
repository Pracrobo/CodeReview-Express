import express from 'express';
import notificationController from '../controllers/notificationController.js';
const router = express.Router();

// 브라우저 알림 SSE 스트림 연결
router.get('/stream', notificationController.initializeSseConnection);
router.post('/email', notificationController.sendEmailNotificationStatus);
export default router;
