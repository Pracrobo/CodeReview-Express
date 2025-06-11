import Database from '../database/database.js';
const pool = Database.getConnectionPool();

async function selectRefreshTokenInfo(userId) {
  try {
    const [rows] = await pool.query('SELECT * FROM email_token_manages');
    return { success: true, data: rows };
  } catch (error) {
    console.error('emailtoken 테이블 select 구문 오류');
    return { success: false };
  }
}

async function upsertToken(userId, refreshToken, refreshTokenExpiresAt) {
  try {
    const result = pool.query(
      `INSERT INTO email_token_manages(user_id, refresh_token, refresh_token_expires_at, created_at, updated_at) \n
        VALUES(?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE (refresh_token, refresh_token_expires_at, created_at, updated_at) = VALUES(?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userId,
        refreshToken,
        refreshTokenExpiresAt,
        refreshToken,
        refreshTokenExpiresAt,
      ]
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('upsert문 오류', error.message);
    return { success: false };
  }
}

export default {
  selectRefreshTokenInfo,
  upsertToken,
};
