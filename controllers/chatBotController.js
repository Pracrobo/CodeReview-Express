import {
  findOrCreateConversation,
  getMessages,
  saveMessage,
} from '../models/ChatBot.js';

// 대화(conversation) 조회 또는 생성
export async function getOrCreateConversation(req, res) {
  const userId = req.query.userId;
  const repoId = req.query.repoId;

  if (!userId || !repoId) {
    return res.status(400).json({ success: false, message: 'userId, repoId 필수' });
  }

  try {
    const conversationId = await findOrCreateConversation(userId, repoId);
    const messages = await getMessages(conversationId);
    res.json({
      success: true,
      conversationId,
      messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}

// 메시지 저장
export async function saveChatMessage(req, res) {
  const { conversationId, senderType, content } = req.query;
  if (!conversationId || !senderType || !content) {
    return res.status(400).json({ success: false, message: '필수 값 누락' });
  }
  try {
    await saveMessage(conversationId, senderType, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}