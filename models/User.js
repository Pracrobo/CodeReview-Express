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
