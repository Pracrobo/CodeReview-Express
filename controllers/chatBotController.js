import ChatBotModel from '../models/ChatBot.js';

// 대화(conversation) 조회 또는 생성
const getOrCreateConversation = async (req, res) => {
  const userId = req.user?.userId;
  const repoId = req.query.repoId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
  }
  if (!repoId) {
    return res.status(400).json({ success: false, message: 'repoId가 필요합니다.' });
  }

  try {
    const conversationId = await ChatBotModel.findOrCreateConversation(userId, repoId);
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

// 메시지 저장
const saveChatMessage = async (req, res) => {
  const { conversationId, senderType, content } = req.body;
  const missingFields = [];
  if (!conversationId) missingFields.push('conversationId');
  if (!senderType) missingFields.push('senderType');
  if (!content) missingFields.push('content');
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `필수 값 누락: ${missingFields.join(', ')}`,
      missingFields,
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
  getOrCreateConversation,
  saveChatMessage,
};
