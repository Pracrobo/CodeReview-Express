import express from 'express';
import { getOrCreateConversation, saveChatMessage } from '../controllers/chatbotController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 대화 조회/생성
router.get('/conversation', authenticate, getOrCreateConversation);

// 메시지 저장
router.post('/message', authenticate, saveChatMessage);

export default router;