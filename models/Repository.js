import { getConnectionPool } from '../database/database.js';

const pool = getConnectionPool();

// DB 조회 결과(snake_case)를 camelCase로 변환
function toCamelCaseRepositories(rows) {
  const data = rows.map((row) => ({
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
    // 새로 추가된 분석 상태 필드들
    analysisStatus: row.analysis_status,
    analysisProgress: row.analysis_progress,
    analysisCurrentStep: row.analysis_current_step,
    analysisErrorMessage: row.analysis_error_message,
    analysisStartedAt: row.analysis_started_at,
    analysisCompletedAt: row.analysis_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return { success: true, data: data };
}

// 저장소 이름으로 검색 (Full-text search)
async function selectRepository(word) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM repositories WHERE MATCH(full_name) AGAINST(? IN BOOLEAN MODE)`,
      [`*${word}*`] // 부분 일치 검색을 위해 와일드카드 추가 (Boolean Mode에서는 단어 단위 검색이 기본)
    );
    return { success: true, data: rows };
  } catch (error) {
    console.error('저장소 검색 쿼리 오류:', error.message);
    return { success: false };
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
    console.error('트래킹 저장소 조회 쿼리 오류:', error.message);
    return { success: false };
  }
}

// 특정 사용자가 특정 저장소를 트래킹하는지 확인
async function selectTrack(userId, githubRepoId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_tracked_repositories WHERE user_id = ? AND repo_id = ?`,
      [userId, githubRepoId]
    );
    if (rows.length > 0) {
      return { success: true, tracked: true };
    } else {
      return { success: true, tracked: false };
    }
  } catch (error) {
    console.error('트래킹 상태 확인 쿼리 오류:', error.message);
    return { success: false };
  }
}

// 사용자의 트래킹 목록에 저장소 추가
async function insertTrack(userId, repoId) {
  try {
    const [result] = await pool.query(
      `INSERT INTO user_tracked_repositories(user_id, repo_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE tracked_at = CURRENT_TIMESTAMP`,
      [userId, repoId]
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('트래킹 추가 쿼리 오류:', error.message);
    return { success: false };
  }
}

// 사용자의 트래킹 목록에서 저장소 삭제
async function deleteTrack(userId, githubRepoId) {
  try {
    const [result] = await pool.query(
      `DELETE FROM user_tracked_repositories WHERE user_id = ? AND repo_id = ?`,
      [userId, githubRepoId]
    );
    return { success: true, data: result }; // affectedRows는 result.affectedRows로 접근
  } catch (error) {
    console.error('트래킹 삭제 쿼리 오류:', error.message);
    return { success: false };
  }
}

// ===== 새로 추가: 저장소 분석 관련 함수들 =====

// 저장소 정보 삽입 또는 업데이트
async function upsertRepository(repositoryData) {
  try {
    const {
      githubRepoId,
      fullName,
      description,
      htmlUrl,
      programmingLanguage,
      licenseSpdxId,
      star,
      fork,
      issueTotalCount,
    } = repositoryData;

    const [result] = await pool.query(
      `INSERT INTO repositories (
        github_repo_id, full_name, description, html_url, 
        programming_language, license_spdx_id, star, fork, issue_total_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        description = VALUES(description),
        html_url = VALUES(html_url),
        programming_language = VALUES(programming_language),
        license_spdx_id = VALUES(license_spdx_id),
        star = VALUES(star),
        fork = VALUES(fork),
        issue_total_count = VALUES(issue_total_count),
        updated_at = CURRENT_TIMESTAMP`,
      [
        githubRepoId,
        fullName,
        description,
        htmlUrl,
        programmingLanguage,
        licenseSpdxId,
        star,
        fork,
        issueTotalCount,
      ]
    );

    // 삽입된 경우 insertId, 업데이트된 경우 기존 repo_id 조회
    let repoId = result.insertId;
    if (!repoId) {
      const [rows] = await pool.query(
        'SELECT repo_id FROM repositories WHERE github_repo_id = ?',
        [githubRepoId]
      );
      repoId = rows[0]?.repo_id;
    }

    return { success: true, data: { repoId, isNew: result.insertId > 0 } };
  } catch (error) {
    console.error('저장소 정보 삽입/업데이트 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 저장소 분석 상태 업데이트
async function updateRepositoryAnalysisStatus(repoId, updateData) {
  try {
    const fields = [];
    const values = [];

    // 동적으로 업데이트할 필드 구성
    if (updateData.analysisStatus !== undefined) {
      fields.push('analysis_status = ?');
      values.push(updateData.analysisStatus);
    }
    if (updateData.analysisProgress !== undefined) {
      fields.push('analysis_progress = ?');
      values.push(updateData.analysisProgress);
    }
    if (updateData.analysisCurrentStep !== undefined) {
      fields.push('analysis_current_step = ?');
      values.push(updateData.analysisCurrentStep);
    }
    if (updateData.analysisErrorMessage !== undefined) {
      fields.push('analysis_error_message = ?');
      values.push(updateData.analysisErrorMessage);
    }
    if (updateData.analysisStartedAt !== undefined) {
      fields.push('analysis_started_at = ?');
      values.push(updateData.analysisStartedAt);
    }
    if (updateData.analysisCompletedAt !== undefined) {
      fields.push('analysis_completed_at = ?');
      values.push(updateData.analysisCompletedAt);
    }
    if (updateData.lastAnalyzedAt !== undefined) {
      fields.push('last_analyzed_at = ?');
      values.push(updateData.lastAnalyzedAt);
    }

    // 분석 완료 시 자동으로 완료 시간 설정
    if (updateData.analysisStatus === 'completed') {
      fields.push('analysis_completed_at = NOW()');
      fields.push('last_analyzed_at = NOW()');
      fields.push('analysis_progress = 100');
    }

    if (fields.length === 0) {
      return { success: false, error: '업데이트할 필드가 없습니다.' };
    }

    values.push(repoId);

    const [result] = await pool.query(
      `UPDATE repositories SET ${fields.join(
        ', '
      )}, updated_at = NOW() WHERE repo_id = ?`,
      values
    );

    return { success: true, data: { affectedRows: result.affectedRows } };
  } catch (error) {
    console.error('저장소 분석 상태 업데이트 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 사용자의 분석 중인 저장소 목록 조회
async function selectAnalyzingRepositories(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        r.repo_id, r.full_name, r.description, r.html_url, r.programming_language,
        r.star, r.fork, r.analysis_status, r.analysis_progress, r.analysis_current_step,
        r.analysis_started_at, r.created_at,
        utr.tracked_at
      FROM repositories r
      JOIN user_tracked_repositories utr ON r.repo_id = utr.repo_id
      WHERE utr.user_id = ? AND r.analysis_status IN ('analyzing')
      ORDER BY r.analysis_started_at DESC`,
      [userId]
    );

    const data = rows.map((row) => ({
      id: row.repo_id,
      name: row.full_name.split('/')[1],
      fullName: row.full_name,
      description: row.description,
      status: row.analysis_status,
      progress: row.analysis_progress,
      currentStep: row.analysis_current_step,
      startedAt: row.analysis_started_at,
      createdAt: row.created_at,
    }));

    return { success: true, data };
  } catch (error) {
    console.error('분석 중인 저장소 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 사용자의 최근 분석 완료된 저장소 목록 조회
async function selectRecentlyAnalyzedRepositories(userId, limit = 10) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        r.repo_id, r.full_name, r.description, r.html_url, r.programming_language,
        r.star, r.fork, r.last_analyzed_at, r.analysis_completed_at,
        utr.tracked_at
      FROM repositories r
      JOIN user_tracked_repositories utr ON r.repo_id = utr.repo_id
      WHERE utr.user_id = ? AND r.analysis_status = 'completed'
      ORDER BY r.analysis_completed_at DESC
      LIMIT ?`,
      [userId, limit]
    );

    const data = rows.map((row) => ({
      id: row.repo_id,
      name: row.full_name.split('/')[1],
      fullName: row.full_name,
      description: row.description,
      htmlUrl: row.html_url,
      programmingLanguage: row.programming_language,
      star: row.star,
      fork: row.fork,
      lastAnalyzed: row.last_analyzed_at,
      completedAt: row.analysis_completed_at,
      isNew: true, // 최근 분석 완료된 것들은 새로운 것으로 표시
    }));

    return { success: true, data };
  } catch (error) {
    console.error('최근 분석 완료 저장소 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 특정 저장소의 분석 상태 조회
async function selectRepositoryAnalysisStatus(repositoryId, userId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        r.repo_id, r.full_name, r.description, r.analysis_status, r.analysis_progress,
        r.analysis_current_step, r.analysis_error_message, r.analysis_started_at,
        r.analysis_completed_at, r.last_analyzed_at,
        CASE WHEN utr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_tracked
      FROM repositories r
      LEFT JOIN user_tracked_repositories utr ON r.repo_id = utr.repo_id AND utr.user_id = ?
      WHERE r.repo_id = ?`,
      [userId, repositoryId]
    );

    if (rows.length === 0) {
      return { success: false, error: '저장소를 찾을 수 없습니다.' };
    }

    const row = rows[0];
    const data = {
      repoId: row.repo_id,
      status: row.analysis_status,
      progress: row.analysis_progress,
      currentStep: row.analysis_current_step,
      errorMessage: row.analysis_error_message,
      startedAt: row.analysis_started_at,
      completedAt: row.analysis_completed_at,
      lastAnalyzedAt: row.last_analyzed_at,
      name: row.full_name.split('/')[1],
      fullName: row.full_name,
      description: row.description,
      isTracked: row.is_tracked === 1,
    };

    return { success: true, data };
  } catch (error) {
    console.error('저장소 분석 상태 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 1시간 이내에 분석 완료된 저장소 확인
async function checkRecentAnalysis(githubRepoId) {
  try {
    const [rows] = await pool.query(
      `SELECT repo_id, full_name, analysis_status, analysis_completed_at, last_analyzed_at
       FROM repositories 
       WHERE github_repo_id = ? 
       AND analysis_status = 'completed' 
       AND analysis_completed_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [githubRepoId]
    );

    if (rows.length > 0) {
      const row = rows[0];
      return {
        success: true,
        hasRecentAnalysis: true,
        data: {
          repoId: row.repo_id,
          fullName: row.full_name,
          analysisStatus: row.analysis_status,
          analysisCompletedAt: row.analysis_completed_at,
          lastAnalyzedAt: row.last_analyzed_at,
        },
      };
    }

    return { success: true, hasRecentAnalysis: false };
  } catch (error) {
    console.error('최근 분석 확인 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 저장소 분석 시작 상태로 업데이트
async function startRepositoryAnalysis(repoId) {
  try {
    const [result] = await pool.query(
      `UPDATE repositories 
       SET analysis_status = 'analyzing', 
           analysis_progress = 0,
           analysis_current_step = '분석 시작 중...',
           analysis_started_at = NOW(),
           analysis_error_message = NULL,
           updated_at = NOW()
       WHERE repo_id = ?`,
      [repoId]
    );

    return { success: true, data: { affectedRows: result.affectedRows } };
  } catch (error) {
    console.error('저장소 분석 시작 상태 업데이트 오류:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  selectRepository,
  selectTrackRepositories,
  insertTrack,
  selectTrack,
  deleteTrack,
  // 새로 추가된 함수들
  upsertRepository,
  updateRepositoryAnalysisStatus,
  selectAnalyzingRepositories,
  selectRecentlyAnalyzedRepositories,
  selectRepositoryAnalysisStatus,
  checkRecentAnalysis,
  startRepositoryAnalysis,
};
