import express from 'express';
import { getOrCreateConversation, saveChatMessage } from '../controllers/chatBotController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 챗봇 대화(conversation) 조회 또는 생성 (인증 필요)
router.get('/conversation', authenticate, getOrCreateConversation);

// 챗봇 메시지 저장 (인증 필요)
router.get('/message', authenticate, saveChatMessage);

export default router;