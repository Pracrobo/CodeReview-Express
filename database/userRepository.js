import getConnectionPool from './index.js';

// snake_case → camelCase 변환 함수
function toCamelCaseUser(user) {
  if (!user) return user;
  return {
    userId: user.user_id,
    githubId: user.github_user_id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url, // camelCase로 변환
  };
}

export async function findUserByGithubId(githubId) {
  const pool = getConnectionPool();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE github_user_id = ?',
    [githubId]
  );
  return toCamelCaseUser(rows[0]);
}

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
    avatarUrl
  };
}

export async function deleteUserByGithubId(githubId) {
  const pool = getConnectionPool();
  await pool.query(
    'DELETE FROM users WHERE github_user_id = ?',
    [githubId]
  );
}