import { getConnectionPool } from '../database/database.js';

// DB 조회 결과(snake_case)를 camelCase로 변환
function toCamelCaseUser(user) {
  if (!user) return user;
  return {
    userId: user.user_id,
    githubId: user.github_user_id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

// GitHub ID로 사용자 조회
export async function findUserByGithubId(githubId) {
  const pool = getConnectionPool();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE github_user_id = ?',
    [githubId]
  );
  return toCamelCaseUser(rows[0]);
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
export async function updateProPlanStatus(userId) {
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
     WHERE user_id = ?`,
    [userId]
  );
}
