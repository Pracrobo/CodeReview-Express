import Database from '../database/database.js';
import UserModel from './User.js';
const pool = Database.getConnectionPool();

// DB 조회 결과(snake_case)를 camelCase로 변환
function mapMessageToCamelCase(row) {
  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    content: row.content,
    timestamp: row.timestamp,
  };
}

// 대화 조회
async function getConversation(userId, repoId) {
  const [rows] = await pool.query(
    'SELECT conversation_id FROM chat_bot_conversations WHERE user_id = ? AND repo_id = ?',
    [userId, repoId]
  );
  return rows.length > 0 ? rows[0].conversation_id : null;
}

// 대화 생성
async function createConversation(userId, repoId) {
  const [result] = await pool.query(
    'INSERT INTO chat_bot_conversations (user_id, repo_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
    [userId, repoId]
  );
  return result.insertId;
}

// 대화 및 메시지 삭제
async function deleteConversation(userId, repoId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // conversationId 조회
    const [rows] = await conn.query(
      'SELECT conversation_id FROM chat_bot_conversations WHERE user_id = ? AND repo_id = ?',
      [userId, repoId]
    );
    if (rows.length === 0) {
      await conn.commit();
      return;
    }
    const conversationId = rows[0].conversation_id;
    // 메시지 삭제
    await conn.query('DELETE FROM chat_bot_messages WHERE conversation_id = ?', [conversationId]);
    // 대화 삭제
    await conn.query('DELETE FROM chat_bot_conversations WHERE conversation_id = ?', [conversationId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// 해당 대화의 메시지 목록 조회
async function getMessages(conversationId) {
  const [rows] = await pool.query(
    `SELECT message_id, conversation_id, sender_type, content, timestamp
     FROM chat_bot_messages
     WHERE conversation_id = ?
     ORDER BY timestamp ASC`,
    [conversationId]
  );
  return rows.map(mapMessageToCamelCase);
}

// 메시지 저장 (Agent 답변일 때 사용량 증가)
async function saveMessage(conversationId, senderType, content, userId) {
  await pool.query(
    'INSERT INTO chat_bot_messages (conversation_id, sender_type, content, timestamp) VALUES (?, ?, ?, NOW())',
    [conversationId, senderType, content]
  );

  // Agent 답변이면 사용량 증가
  if (senderType === 'Agent' && userId) {
    await UserModel.increaseMonthlyAiMessageCount(userId);
  }
}

export default {
  getConversation,
  createConversation,
  deleteConversation,
  getMessages,
  saveMessage,
};