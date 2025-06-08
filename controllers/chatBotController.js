import ChatBotModel from '../models/ChatBot.js';

// 대화 조회
async function getConversation(req, res) {
  const userId = req.user?.userId;
  const repoId = req.query.repoId;

  if (!userId) return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  if (!repoId) return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });

  try {
    const conversationId = await ChatBotModel.getConversation(userId, repoId);
    if (!conversationId) {
      return res.json({
        success: true,
        conversationId: null,
        messages: [],
        message: '대화가 없습니다.',
      });
    }
    const messages = await ChatBotModel.getMessages(conversationId);
    res.json({
      success: true,
      conversationId,
      messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}

// 대화 생성
async function createConversation(req, res) {
  const userId = req.user?.userId;
  const repoId = req.body.repoId;

  if (!userId) return res.status(401).json({ success: false, message: 'userId가 필요합니다.' });
  if (!repoId) return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });

  try {
    // 이미 존재하는 대화가 있는지 먼저 확인
    const existingConversationId = await ChatBotModel.getConversation(userId, repoId);
    if (existingConversationId) {
      return res.json({ success: true, conversationId: existingConversationId, messages: [] });
    }
    // 없으면 새로 생성
    const conversationId = await ChatBotModel.createConversation(userId, repoId);
    res.json({ success: true, conversationId, messages: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}

// 대화 삭제
async function deleteConversation(req, res) {
  const userId = req.user?.userId;
  const repoId = req.body.repoId;

  if (!userId) return res.status(401).json({ success: false, message: 'userId가 필요합니다.' });
  if (!repoId) return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });

  try {
    await ChatBotModel.deleteConversation(userId, repoId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}

// 채팅 메시지 저장
async function saveChatMessage(req, res) {
  const { conversationId, senderType, content } = req.body;
  if (!conversationId || !senderType || !content) {
    return res.status(400).json({
      success: false,
      message: '필수 값 누락',
    });
  }
  try {
    await ChatBotModel.saveMessage(conversationId, senderType, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
}

export default {
  getConversation,
  createConversation,
  deleteConversation,
  saveChatMessage,
};
