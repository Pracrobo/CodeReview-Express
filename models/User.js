import { getConnectionPool } from '../database/database.js';

// DB 조회 결과(snake_case)를 camelCase로 변환
export function mapUserToCamelCase(userRow) {
  if (!userRow) return userRow;
  return {
    userId: userRow.user_id,
    githubId: userRow.github_user_id,
    username: userRow.username,
    email: userRow.email,
    avatarUrl: userRow.avatar_url,
    refreshToken: userRow.refresh_token,
    refreshTokenExpiresAt: userRow.refresh_token_expires_in,
    isProPlan: !!userRow.is_pro_plan,
    proPlanActivatedAt: userRow.pro_plan_activated_at,
    proPlanExpiresAt: userRow.pro_plan_expires_at,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };
}

// GitHub ID로 사용자 조회
export async function findUserByGithubId(githubId) {
  const pool = getConnectionPool();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE github_user_id = ?',
    [githubId]
  );
  return mapUserToCamelCase(rows[0]);
}

// 새 사용자 생성
export async function createUser({ githubId, username, email, avatarUrl }) {
  const pool = getConnectionPool();
  const [result] = await pool.query(
    `INSERT INTO users (github_user_id, username, email, avatar_url) VALUES (?, ?, ?, ?)`,
    [githubId, username, email, avatarUrl]
  );
  return {
    userId: result.insertId,
    githubId,
    username,
    email,
    avatarUrl,
  };
}

// GitHub ID로 사용자 삭제
export async function deleteUserByGithubId(githubId) {
  const pool = getConnectionPool();
  await pool.query('DELETE FROM users WHERE github_user_id = ?', [githubId]);
}

// 프로 사용자 플랜 상태 업데이트
export async function updateProPlanStatus(githubId) {
  const pool = getConnectionPool();
  await pool.query(
    `UPDATE users
     SET is_pro_plan = 1,
         pro_plan_activated_at = NOW(),
         pro_plan_expires_at = 
           CASE
             WHEN pro_plan_expires_at > NOW() THEN DATE_ADD(pro_plan_expires_at, INTERVAL 1 MONTH) - INTERVAL 1 SECOND
             ELSE DATE_ADD(NOW(), INTERVAL 1 MONTH) - INTERVAL 1 SECOND
           END,
         updated_at = NOW()
     WHERE github_user_id = ?`,
    [githubId]
  );
}

// 사용자 리프레시 토큰 업데이트
export async function updateUserRefreshToken(userId, hashedRefreshToken, refreshTokenExpiresAt) {
  const pool = getConnectionPool();
  await pool.query(
    'UPDATE users SET refresh_token = ?, refresh_token_expires_in = ? WHERE user_id = ?',
    [hashedRefreshToken, refreshTokenExpiresAt, userId]
  );
}

// 리프레시 토큰으로 사용자 조회
export async function findUserByRefreshToken(hashedRefreshToken) {
  const pool = getConnectionPool();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE refresh_token = ?',
    [hashedRefreshToken]
  );
  return mapUserToCamelCase(rows[0]);
}

// 사용자 리프레시 토큰 삭제
export async function clearUserRefreshToken(userId) {
  const pool = getConnectionPool();
  await pool.query(
    'UPDATE users SET refresh_token = NULL, refresh_token_expires_in = NULL WHERE user_id = ?',
    [userId]
  );
}
