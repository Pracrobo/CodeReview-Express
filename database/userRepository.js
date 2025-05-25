import getConnectionPool from './index.js';

export async function findUserByGithubId(githubId) {
  const pool = getConnectionPool();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE github_user_id = ?',
    [githubId]
  );
  return rows[0];
}

export async function createUser({ githubId, username, email, avatar_url }) {
  const pool = getConnectionPool();
  const [result] = await pool.query(
    `INSERT INTO users (github_user_id, username, email, avatar_url) VALUES (?, ?, ?, ?)`,
    [githubId, username, email, avatar_url]
  );
  return {
    user_id: result.insertId,
    github_user_id: githubId,
    username,
    email,
    avatar_url
  };
}

export async function deleteUserByGithubId(githubId) {
  const pool = getConnectionPool();
  await pool.query(
    'DELETE FROM users WHERE github_user_id = ?',
    [githubId]
  );
}