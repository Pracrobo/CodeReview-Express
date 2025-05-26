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


// 내가 저장한 레포 목록(트래킹테이블에 있는)레포의 정보 가져오기
async function selectTrackRepositories(userId) {
  try {
    const [rows] = await pool.query(
    `SELECT r.* FROM user_tracked_repositories utr
    JOIN repositories r ON utr.repo_id = r.repo_id
    WHERE utr.user_id = ?`,
    [userId])
    return { status: true, data: rows };
  }catch(err) {
    console.error("select repositories, user_tracked_repositories query error:", err);
    return { status: false, error: err }
  }
};


async function selectTrack(userId, githubRepoId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_tracked_repositories WHERE user_id = ? AND repo_id = ?`,
      [userId, githubRepoId]
    );
    //성공했지만 tracking 여부에 따라 분기
    if (rows.length > 0) {
      return { status: true, tracked: true, data: rows };
    } else {
      return { status: true, tracked: false };
    }
    
  } catch (err) {
    console.error('DB select error:', err);
    return { status: false, tracked: false };
  }
}

async function insertTrack(userId, githubRepoId) {
  try {
    const [rows] = await pool.query(
      `INSERT INTO user_tracked_repositories(user_id, repo_id) VALUES (?, ?)`,
      [userId, githubRepoId]
    );
    console.log("Insert successful:", rows);
    return rows;
  } catch (error) {
    console.error("Error occurred during insert:", error.message);
    return error.message;
  }
}

async function deleteTrack(userId, githubRepoId) {
  try {
    const [rows] = await pool.query(
      `DELETE FROM user_tracked_repositories WHERE user_id=? AND repo_id=?`,
      [userId, githubRepoId]
    );
    return rows;
  } catch (error) {
    console.error("Error occurred during delete:", error.message);
    return error.message;
  }
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
  
  export default {
    selectRepository,
    selectTrackRepositories,
    insertTrack,
    selectTrack,
    deleteTrack
};
