import Database from '../database/database.js';
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
async function findConversation(userId, repoId) {
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

// 메시지 저장
async function saveMessage(conversationId, senderType, content) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO chat_bot_messages (conversation_id, sender_type, content, timestamp) VALUES (?, ?, ?, NOW())',
      [conversationId, senderType, content]
    );
    await conn.query(
      'UPDATE chat_bot_conversations SET updated_at = NOW() WHERE conversation_id = ?',
      [conversationId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default {
  findConversation,
  createConversation,
  getMessages,
  saveMessage,
};