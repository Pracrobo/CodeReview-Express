import ChatBotModel from '../models/ChatBot.js';

// 대화 조회
const getConversation = async (req, res) => {
  const userId = req.user?.userId || req.query.userId;
  const repoId = req.query.repoId;

  if (!userId) return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
  if (!repoId) return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });

  try {
    const conversationId = await ChatBotModel.findConversation(userId, repoId);
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
};

// 대화 생성
const createConversation = async (req, res) => {
  const userId = req.user?.userId || req.body.userId;
  const repoId = req.body.repoId;

  if (!userId) return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
  if (!repoId) return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });

  try {
    const conversationId = await ChatBotModel.createConversation(userId, repoId);
    res.json({ success: true, conversationId, messages: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB 오류', error: err.message });
  }
};

// 메시지 저장
const saveChatMessage = async (req, res) => {
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
};

export default {
  getConversation,
  createConversation,
  saveChatMessage,
};
