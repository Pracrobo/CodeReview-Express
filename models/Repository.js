import { getConnectionPool } from '../database/database.js';

const pool = getConnectionPool();


// DB 조회 결과(snake_case)를 camelCase로 변환
function toCamelCaseRepositories(rows) {
  return rows.map((row) => ({
    repoId: row.repo_id,
    githubRepoId: row.github_repo_id,
    fullName: row.full_name,
    description: row.description,
    htmlUrl: row.html_url,
    isTrackedByCurrentUser: true,
    programmingLanguage: row.programming_language,
    languagePercentage: row.language_percentage,
    licenseSpdxId: row.license_spdx_id,
    readmeSummaryGpt: row.readme_summary_gpt,
    star: row.star,
    fork: row.fork,
    prTotalCount: row.pr_total_count,
    issueTotalCount: row.issue_total_count,
    lastAnalyzedAt: row.last_analyzed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// 저장소 이름으로 검색 (Full-text search)
async function selectRepository(word) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM repositories WHERE MATCH(full_name) AGAINST(? IN BOOLEAN MODE)`,
      [`*${word}*`] // 부분 일치 검색을 위해 와일드카드 추가 (Boolean Mode에서는 단어 단위 검색이 기본)
    );
    return { status: true, data: rows };
  } catch (error) {
    console.error('저장소 검색 쿼리 오류:', error);
    return { status: false, error: error.message };
  }
}

// 사용자가 트래킹하는 저장소 목록 조회
async function selectTrackRepositories(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT r.* FROM user_tracked_repositories utr
    JOIN repositories r ON utr.repo_id = r.repo_id
    WHERE utr.user_id = ?`,
      [userId]
    );
    return toCamelCaseRepositories(rows);
  } catch (error) {
    console.error('트래킹 저장소 조회 쿼리 오류:', error);
    return { status: false, error: error.message };
  }
}

// 특정 사용자가 특정 저장소를 트래킹하는지 확인
async function selectTrack(userId, githubRepoId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_tracked_repositories WHERE user_id = ? AND repo_id = ?`,
      [userId, githubRepoId]
    );
    if( rows.length > 0){
      return { status: true, tracked: true };
    }else {
      return { status: true, tracked: false };
    }
  } catch (error) {
    console.error('트래킹 상태 확인 쿼리 오류:', error);
    return { status: false, error: error.message};
  }
}

// 사용자의 트래킹 목록에 저장소 추가
async function insertTrack(userId, githubRepoId) {
  try {
    const [result] = await pool.query(
      `INSERT INTO user_tracked_repositories(user_id, repo_id) VALUES (?, ?)`,
      [userId, githubRepoId]
    );
    return { status: true, data: result };
  } catch (error) {
    console.error('트래킹 추가 쿼리 오류:', error);
    return { status: false, error: error.message };
  }
}

// 사용자의 트래킹 목록에서 저장소 삭제
async function deleteTrack(userId, githubRepoId) {
  try {
    const [result] = await pool.query(
      `DELETE FROM user_tracked_repositories WHERE user_id = ? AND repo_id = ?`,
      [userId, githubRepoId]
    );
    return { status: true, data: result }; // affectedRows는 result.affectedRows로 접근
  } catch (error) {
    console.error('트래킹 삭제 쿼리 오류:', error);
    return { status: false, error: error.message };
  }
}

export default {
  selectRepository,
  selectTrackRepositories,
  insertTrack,
  selectTrack,
  deleteTrack,
};
