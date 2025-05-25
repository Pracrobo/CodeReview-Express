// repositoryModel.js
import pool from "../database/index.js";

async function selectRepository(word) {
  try {
    const [results] = await pool.query(
      `SELECT * FROM repositories WHERE MATCH(full_name) AGAINST(? IN BOOLEAN MODE)`,
      [word]
    );
    return results;
  } catch (err) {
    console.error("selectRepository query error:", err);
    throw err;
  }
}


// 내가 저장한 레포 목록 가져오기
async function selectMyRepositories(userId) {
  const [rows] = await pool.query(
  `SELECT repo_id FROM user_tracked_repositories WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) return [];
  const repoIds = rows.map(row => row.repo_id); 

  const [repoList] = await pool.query(
    `SELECT * FROM repositories WHERE repo_id IN (?)`,
    [repoIds]
  );
  return repoList
}

// async function insertRepository(userId, githubRepositoryInfo ){
//   try{
//     await pool.query(
//       `INSERT INTO ? (github_repo_id, full_name, description, html_url,
//       programming_language, language_percentage, license_spdx_id, readme_summary_gpt,
//       star, fork, pr_total_count, issue_total_count,
//       last_analyzed_at, created_at, updated_at) VALUES 
//       ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
//       ?, ?, ?, ?, ?)`, []
//     )
//     return true
//   }catch {
//     return false
//   }
// }

// async function insertTrack(userId, githubRepoId) {
//   try{
//     await pool.query(
//       `INSERT INTO ? (user_id, repo_id) VALUES (?, ?)`, [userId, githubRepoId]
//     )
//     return true
//   }catch{
//     return false
//   }
// }

// async function selectTrack(userId, githubRepoId) {
//   try{
//     const [result] = await pool.query(
//       `SELECT * FROM WHERE user_id = ? AND repo_id = ?`, [userId, githubRepoId]
//     )
//     return result 
//   }catch {
//     return false
//   };
// }

export default {
  selectRepository,
  selectMyRepositories,
//  insertRepository,
//  insertTrack,
//  selectTrack
};
