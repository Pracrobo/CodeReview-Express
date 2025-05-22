// repositoryModel.js
import dbConnection from "../config/db_index.js";

// 내가 저장한 목록 중 특정 repository 찾기
async function selectRepository(word) {
  const conn = await dbConnection();
  const [results] = await conn.query(
    `SELECT * FROM Repositories WHERE MATCH(full_name) AGAINST(? IN BOOLEAN MODE)`,
    [word]
  );
  return results;
}

// 내가 저장한 레포 목록 가져오기
async function selectMyRepositories(userId = 1) {
  const conn = await dbConnection();
  const [rows] = await conn.query(
  `SELECT repo_id FROM UserTrackedRepositories WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) return [];

  const repoIds = rows.map(row => row.repo_id); 

  const [repoList] = await conn.query(
    `SELECT * FROM Repositories WHERE repo_id IN (?)`,
    [repoIds]
  );
  return repoList
}

export default {
  selectRepository,
  selectMyRepositories,
};
