import Database from '../database/database.js';
const pool = Database.getConnectionPool();

// DB 조회 결과(snake_case)를 camelCase로 변환
function mapUserToCamelCase(userRow) {
  if (!userRow) return userRow;
  return {
    userId: userRow.user_id,
    githubId: userRow.github_user_id,
    username: userRow.username,
    email: userRow.email,
    avatarUrl: userRow.avatar_url,
    refreshToken: userRow.refresh_token,
    refreshTokenExpiresAt: userRow.refresh_token_expires_at,
    isProPlan: !!userRow.is_pro_plan,
    proPlanActivatedAt: userRow.pro_plan_activated_at,
    proPlanExpiresAt: userRow.pro_plan_expires_at,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };
}

// GitHub ID로 사용자 조회 (updated_at만 갱신)
async function findUserByGithubId(githubId) {
  await pool.query(
    `UPDATE users SET updated_at = NOW() WHERE github_user_id = ?`,
    [githubId]
  );
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE github_user_id = ?',
    [githubId]
  );
  return mapUserToCamelCase(rows[0]);
}

// 사용자 ID로 사용자 이름 조회
async function findUsernameByUserId(userId) {
  const [rows] = await pool.query(
    'SELECT username FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0] ? rows[0].username : null;
}

// 새 사용자 생성
async function createUser({ githubId, username, email, avatarUrl }) {
  const [result] = await pool.query(
    `INSERT INTO users 
      (github_user_id, username, email, avatar_url, created_at, updated_at) 
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
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
async function deleteUserByGithubId(githubId) {
  await pool.query(
    `UPDATE users SET updated_at = NOW() WHERE github_user_id = ?`,
    [githubId]
  );
  await pool.query('DELETE FROM users WHERE github_user_id = ?', [githubId]);
}

// 프로 사용자 플랜 상태 업데이트
async function updateProPlanStatus(githubId) {
  await pool.query(
    `UPDATE users
     SET is_pro_plan = 1,
         pro_plan_activated_at = 
           CASE
             WHEN pro_plan_expires_at > NOW() THEN pro_plan_activated_at
             ELSE NOW()
           END,
         pro_plan_expires_at = 
           CASE
             WHEN pro_plan_expires_at > NOW() THEN DATE_SUB(DATE_ADD(pro_plan_expires_at, INTERVAL 1 MONTH), INTERVAL 1 SECOND)
             ELSE DATE_SUB(DATE_ADD(NOW(), INTERVAL 1 MONTH), INTERVAL 1 SECOND)
           END,
         updated_at = NOW()
     WHERE github_user_id = ?`,
    [githubId]
  );
}

// 사용자 리프레시 토큰 업데이트
async function updateUserRefreshToken(userId, hashedRefreshToken, refreshTokenExpiresAt) {
  await pool.query(
    "UPDATE users SET refresh_token = ?, refresh_token_expires_at = ?, updated_at = NOW() WHERE user_id = ?",
    [hashedRefreshToken, refreshTokenExpiresAt, userId]
  );
}

// 리프레시 토큰으로 사용자 조회
async function findUserByRefreshToken(hashedRefreshToken) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE refresh_token = ?',
    [hashedRefreshToken]
  );
  return mapUserToCamelCase(rows[0]);
}

// 사용자 리프레시 토큰 삭제
async function clearUserRefreshToken(userId) {
  await pool.query(
    "UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL, updated_at = NOW() WHERE user_id = ?",
    [userId]
  );
}

export default {
  mapUserToCamelCase,
  findUserByGithubId,
  findUsernameByUserId,
  createUser,
  deleteUserByGithubId,
  updateProPlanStatus,
  updateUserRefreshToken,
  findUserByRefreshToken,
  clearUserRefreshToken,
};
