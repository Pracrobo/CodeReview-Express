import UserModel from '../models/User.js';
import ChatBotModel from '../models/ChatBot.js';
import Repository from '../models/Repository.js';
import FlaskService from '../services/flaskService.js';

// 한도 상수 선언
const FREE_CHATBOT_MESSAGE_LIMIT = 100;

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

// 챗봇 메시지 저장 (사용량 제한 체크 포함)
async function saveChatMessage(req, res) {
  const userId = req.user.userId;
  const { conversationId, senderType, content, repoId, messages } = req.body;

  // 사용량 조회
  const usage = await UserModel.getMonthlyUsageByUserId(userId);

  // 무료 플랜: 100개 제한
  if (!usage.isProPlan && usage.chatbotMessageCount >= FREE_CHATBOT_MESSAGE_LIMIT) {
    return res.status(403).json({
      success: false,
      message: `무료 플랜의 월간 AI 챗봇 메시지 한도(${FREE_CHATBOT_MESSAGE_LIMIT}개)를 초과했습니다.`,
      errorType: 'CHATBOT_MESSAGE_LIMIT_EXCEEDED',
    });
  }
  // Pro 플랜: 무제한(제한 없음)

  // 메시지 저장
  await ChatBotModel.saveMessage(conversationId, senderType, content, userId);

  let answer = null;
  if (senderType === 'User') {
    // 저장소 상세 정보에서 파일명들 가져오기
    const repoInfoResult = await Repository.selectRepositoryDetails(repoId, userId);
    if (!repoInfoResult.success) {
      return res.status(404).json({ success: false, message: '저장소 정보를 찾을 수 없습니다.' });
    }
    const repoInfo = repoInfoResult.data;

    const repoNameForFlask = repoInfo.fullName.split('/')[1];

    // messages 배열이 없으면 생성
    const messagesForAsk = messages && Array.isArray(messages)
      ? messages
      : [{ role: 'user', content }];

    // Flask에 질문 전달
    const flaskRes = await FlaskService.askRepositoryQuestion(
      repoNameForFlask,
      messagesForAsk,
      repoInfo.readmeFilename,
      repoInfo.licenseFilename,
      repoInfo.contributingFilename
    );
    if (flaskRes.success && flaskRes.data.answer) {
      await ChatBotModel.saveMessage(conversationId, 'Agent', flaskRes.data.answer, req.user.userId);
      answer = flaskRes.data.answer;
    }
  }

  // 4. 모든 메시지 반환
  const allMessages = await ChatBotModel.getMessages(conversationId);
  res.json({ success: true, messages: allMessages, answer });
}

export default {
  getConversation,
  createConversation,
  deleteConversation,
  saveChatMessage,
};
