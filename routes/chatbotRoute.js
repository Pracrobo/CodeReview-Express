import express from 'express';
import chatBotController from '../controllers/chatbotController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 대화 조회
router.get('/conversation', authenticate, chatBotController.getConversation);

// 대화 생성
router.post('/conversation', authenticate, chatBotController.createConversation);

// 대화 삭제
router.delete('/conversation', authenticate, chatBotController.deleteConversation);

// 메시지 저장
router.post('/message', authenticate, chatBotController.saveChatMessage);

export default router;