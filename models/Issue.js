import Database from '../database/database.js';
import githubApiService from '../services/githubApiService.js';

const pool = Database.getConnectionPool();

// 날짜 포매팅 함수 (YYYY-MM-DD HH:mm:ss)
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  );
}

// 저장소 URL 구성 함수
function buildRepoUrl(repoFullName) {
  if (!repoFullName) return '';
  return `https://github.com/${repoFullName}`;
}

// 이슈 목록 조회 (repoId 기준, 저장소명 포함)
async function selectIssuesByRepoId(repoId, state = null) {
  try {
    let query = `
      SELECT i.*, r.full_name as repo_full_name
      FROM issues i
      JOIN repositories r ON i.repo_id = r.repo_id
      WHERE i.repo_id = ?
    `;
    const params = [repoId];
    if (state) {
      query += ` AND i.state = ?`;
      params.push(state);
    }
    query += ` ORDER BY i.created_at_github DESC`;
    const [rows] = await pool.query(query, params);
    const data = rows.map((row) => ({
      issueId: row.issue_id,
      repoId: row.repo_id,
      githubIssueId: row.github_issue_id,
      githubIssueNumber: row.github_issue_number,
      title: row.title,
      body: row.body,
      author: row.author,
      state: row.state,
      score: row.score,
      htmlUrl: row.html_url,
      summaryGpt: row.summary_gpt,
      tagsGptJson: row.tags_gpt_json,
      createdAtGithub: formatDate(row.created_at_github),
      updatedAtGithub: formatDate(row.updated_at_github),
      createdAtDb: formatDate(row.created_at_db),
      updatedAtDb: formatDate(row.updated_at_db),
      repoName: row.repo_full_name ? row.repo_full_name.split('/')[1] : '',
    }));
    return { success: true, data };
  } catch (error) {
    console.error('이슈 목록 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 여러 저장소의 이슈를 한 번에 불러오기 (페이지네이션 지원, 저장소명 포함)
async function selectIssuesByRepoIds({
  repoIds = [],
  state = null,
  limit = 20,
  offset = 0,
  search = '',
}) {
  if (!repoIds || repoIds.length === 0) return { success: true, data: [] };
  try {
    let query = `
      SELECT i.*, r.full_name as repo_full_name
      FROM issues i
      JOIN repositories r ON i.repo_id = r.repo_id
      WHERE i.repo_id IN (${repoIds.map(() => '?').join(',')})
    `;
    const params = [...repoIds];
    if (state) {
      query += ` AND i.state = ?`;
      params.push(state);
    }
    if (search) {
      query += ` AND (i.title LIKE ? OR i.body LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY i.created_at_github DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(query, params);
    const data = rows.map((row) => ({
      issueId: row.issue_id,
      repoId: row.repo_id,
      githubIssueId: row.github_issue_id,
      githubIssueNumber: row.github_issue_number,
      title: row.title,
      body: row.body,
      author: row.author,
      state: row.state,
      score: row.score,
      htmlUrl: row.html_url,
      summaryGpt: row.summary_gpt,
      tagsGptJson: row.tags_gpt_json,
      createdAtGithub: formatDate(row.created_at_github),
      updatedAtGithub: formatDate(row.updated_at_github),
      createdAtDb: formatDate(row.created_at_db),
      updatedAtDb: formatDate(row.updated_at_db),
      repoName: row.repo_full_name ? row.repo_full_name.split('/')[1] : '', // 저장소명 추가
      repoFullName: row.repo_full_name || '',
    }));
    return { success: true, data };
  } catch (error) {
    console.error('여러 저장소 이슈 목록 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// open 이슈 목록을 DB에 저장 (bulk upsert)
async function upsertIssues(repoId, issues) {
  if (!issues || issues.length === 0) return { success: true };
  try {
    const values = issues.map((issue) => [
      repoId,
      issue.id,
      issue.number,
      issue.title,
      issue.body || '',
      issue.user?.login || '',
      issue.state,
      issue.html_url,
      new Date(issue.created_at),
      new Date(issue.updated_at),
    ]);
    const [result] = await pool.query(
      `INSERT INTO issues (
        repo_id, github_issue_id, github_issue_number, title, body, author, state, html_url, created_at_github, updated_at_github
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        title=VALUES(title),
        body=VALUES(body),
        author=VALUES(author),
        state=VALUES(state),
        html_url=VALUES(html_url),
        updated_at_github=VALUES(updated_at_github),
        updated_at_db=NOW()`,
      [values]
    );
    return { success: true, data: { affectedRows: result.affectedRows } };
  } catch (error) {
    console.error('이슈 bulk upsert 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 최근 본 이슈 저장 (userId, issueId, viewedAt)
async function upsertRecentIssue(userId, issueId, viewedAt = new Date()) {
  try {
    const [result] = await pool.query(
      `INSERT INTO user_recent_issues (user_id, issue_id, viewed_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)`,
      [userId, issueId, viewedAt]
    );
    return { success: true, data: { affectedRows: result.affectedRows } };
  } catch (error) {
    console.error('최근 본 이슈 저장 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 최근 본 이슈 목록 조회 (페이지네이션, 저장소명 포함)
async function selectRecentIssues(userId, limit = 20, offset = 0) {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, uri.viewed_at, r.full_name as repo_full_name
       FROM user_recent_issues uri
       JOIN issues i ON uri.issue_id = i.issue_id
       JOIN repositories r ON i.repo_id = r.repo_id
       WHERE uri.user_id = ?
       ORDER BY uri.viewed_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );
    const data = rows.map((row) => ({
      issueId: row.issue_id,
      repoId: row.repo_id,
      githubIssueId: row.github_issue_id,
      githubIssueNumber: row.github_issue_number,
      title: row.title,
      body: row.body,
      author: row.author,
      state: row.state,
      score: row.score,
      htmlUrl: row.html_url,
      summaryGpt: row.summary_gpt,
      tagsGptJson: row.tags_gpt_json,
      createdAtGithub: formatDate(row.created_at_github),
      updatedAtGithub: formatDate(row.updated_at_github),
      createdAtDb: formatDate(row.created_at_db),
      updatedAtDb: formatDate(row.updated_at_db),
      viewedAt: formatDate(row.viewed_at),
      repoName: row.repo_full_name ? row.repo_full_name.split('/')[1] : '',
      repoFullName: row.repo_full_name || '',
    }));
    return { success: true, data };
  } catch (error) {
    console.error('최근 본 이슈 목록 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 이슈 댓글 조회 함수 개선 (GitHub API 연동)
async function selectIssueComments(
  repoId,
  githubIssueNumber,
  repoFullName,
  userGithubAccessToken
) {
  try {
    // GitHub API에서 댓글을 가져옴
    if (!repoFullName) {
      return { success: true, data: [] };
    }
    const comments = await githubApiService.getIssueComments(
      repoFullName,
      githubIssueNumber,
      userGithubAccessToken
    );
    // GitHub API 응답을 프론트에서 사용하는 형태로 변환
    const data = (comments || []).map((c) => ({
      user: c.user?.login || '사용자',
      body: c.body || '',
      createdAt: c.created_at
        ? new Date(c.created_at).toLocaleString('ko-KR')
        : '',
      avatarUrl: c.user?.avatar_url || '',
      commentId: c.id,
    }));
    return { success: true, data };
  } catch (error) {
    console.error('이슈 댓글 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// AI 코드 스니펫 추천 조회
async function selectRecommendedCodeSnippets(issueId) {
  try {
    // type='snippet'만 조회
    const [rows] = await pool.query(
      `SELECT 
        recommendation_id,
        file_path,
        function_name,
        class_name,
        code_snippet,
        relevance_score,
        explanation_gpt
       FROM recommended_code_snippets 
       WHERE issue_id = ? AND type = 'snippet'
       ORDER BY relevance_score DESC 
       LIMIT 10`,
      [issueId]
    );

    const data = rows.map((row) => ({
      recommendationId: row.recommendation_id,
      filePath: row.file_path,
      functionName: row.function_name,
      className: row.class_name,
      codeSnippet: row.code_snippet,
      relevanceScore: parseFloat(row.relevance_score || 0),
      explanationGpt: row.explanation_gpt,
    }));

    return { success: true, data };
  } catch (error) {
    console.error('AI 코드 스니펫 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// === 관련 파일 추천 조회 함수 추가 ===
async function selectRecommendedRelatedFiles(issueId) {
  try {
    // type='file'만 조회
    const [rows] = await pool.query(
      `SELECT 
        recommendation_id,
        file_path,
        relevance_score,
        explanation_gpt
       FROM recommended_code_snippets 
       WHERE issue_id = ? AND type = 'file'
       ORDER BY relevance_score DESC 
       LIMIT 10`,
      [issueId]
    );

    const data = rows.map((row) => ({
      path: row.file_path,
      relevance: parseFloat(row.relevance_score || 0),
      explanation: row.explanation_gpt,
    }));

    return { success: true, data };
  } catch (error) {
    console.error('AI 관련 파일 추천 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 이슈 상세 조회 (repoId, githubIssueNumber 기준, 저장소명 포함)
async function selectIssueDetail(repoId, githubIssueNumber) {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, r.full_name as repo_full_name
       FROM issues i
       JOIN repositories r ON i.repo_id = r.repo_id
       WHERE i.repo_id = ? AND i.github_issue_number = ? LIMIT 1`,
      [repoId, githubIssueNumber]
    );
    if (rows.length === 0) {
      return { success: false, error: '이슈를 찾을 수 없습니다.' };
    }
    const row = rows[0];
    const data = {
      issueId: row.issue_id,
      repoId: row.repo_id,
      githubIssueId: row.github_issue_id,
      githubIssueNumber: row.github_issue_number,
      title: row.title,
      body: row.body,
      author: row.author,
      state: row.state,
      score: row.score,
      htmlUrl: row.html_url,
      summaryGpt: row.summary_gpt,
      tagsGptJson: row.tags_gpt_json,
      createdAtGithub: formatDate(row.created_at_github),
      updatedAtGithub: formatDate(row.updated_at_github),
      createdAtDb: formatDate(row.created_at_db),
      updatedAtDb: formatDate(row.updated_at_db),
      repoName: row.repo_full_name ? row.repo_full_name.split('/')[1] : '',
      repoFullName: row.repo_full_name || '',
      repoUrl: buildRepoUrl(row.repo_full_name),
      // === AI 해결 제안도 포함 ===
      solutionSuggestion: row.solution_suggestion_gpt || '',
    };
    return { success: true, data };
  } catch (error) {
    console.error('이슈 상세 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 이슈 상세 조회 (댓글 및 AI 분석 포함)
async function selectIssueDetailWithExtras(
  repoId,
  githubIssueNumber,
  commentsOverride = null
) {
  try {
    // 기본 이슈 정보 조회
    const issueResult = await selectIssueDetail(repoId, githubIssueNumber);
    if (!issueResult.success) {
      return issueResult;
    }

    const issue = issueResult.data;

    // 댓글 조회
    let comments = [];
    if (commentsOverride) {
      comments = commentsOverride;
    } else {
      const commentsResult = await selectIssueComments(
        repoId,
        githubIssueNumber
      );
      comments = commentsResult.success ? commentsResult.data : [];
    }

    // AI 코드 스니펫 조회
    const snippetsResult = await selectRecommendedCodeSnippets(issue.issueId);
    const codeSnippets = snippetsResult.success ? snippetsResult.data : [];

    // === 관련 파일 추천 조회 ===
    const relatedFilesResult = await selectRecommendedRelatedFiles(
      issue.issueId
    );
    const relatedFiles = relatedFilesResult.success
      ? relatedFilesResult.data
      : [];

    // 라벨 정보 파싱 (JSON에서 배열로 변환)
    let labels = [];
    if (issue.tagsGptJson) {
      try {
        const tagsData = JSON.parse(issue.tagsGptJson);
        labels = Array.isArray(tagsData) ? tagsData : [];
      } catch (error) {
        console.warn('태그 JSON 파싱 오류:', error.message);
      }
    }

    // 분석 여부 플래그 추가
    const hasAnalysis =
      !!issue.summaryGpt &&
      issue.summaryGpt.trim() !== '' &&
      issue.summaryGpt !== 'AI 요약 정보 없음';

    return {
      success: true,
      data: {
        ...issue,
        labels,
        comments,
        aiAnalysis: {
          summary: issue.summaryGpt || 'AI 요약 정보 없음',
          codeSnippets: codeSnippets.map((snippet) => ({
            file: snippet.filePath,
            code: snippet.codeSnippet,
            relevance: snippet.relevanceScore,
            explanation: snippet.explanationGpt,
            functionName: snippet.functionName,
            className: snippet.className,
          })),
          relatedFiles: relatedFiles,
          suggestion: issue.solutionSuggestion || '',
        },
        hasAnalysis, // 분석 여부 반환
      },
    };
  } catch (error) {
    console.error('이슈 상세 조회 (확장) 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// AI 분석 결과 저장
async function updateIssueAnalysis(issueId, analysisData) {
  try {
    const { summary, relatedFiles, codeSnippets, solutionSuggestion } =
      analysisData;
    // 이슈 테이블에 요약 업데이트
    await pool.query('UPDATE issues SET summary_gpt = ? WHERE issue_id = ?', [
      summary,
      issueId,
    ]);

    // 관련 파일 정보를 recommended_code_snippets 테이블에 저장 (type='file')
    if (relatedFiles && relatedFiles.length > 0) {
      for (const file of relatedFiles) {
        await pool.query(
          `INSERT INTO recommended_code_snippets 
           (issue_id, file_path, code_snippet, relevance_score, explanation_gpt, function_name, class_name, type)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'file')`,
          [
            issueId,
            file.path,
            '', // 관련 파일은 코드 없음
            file.relevance,
            `관련도 ${file.relevance}%의 파일입니다.`,
            null,
            null,
          ]
        );
      }
    }

    // 코드 스니펫 저장 (type='snippet')
    if (codeSnippets && codeSnippets.length > 0) {
      for (const snippet of codeSnippets) {
        await pool.query(
          `INSERT INTO recommended_code_snippets 
           (issue_id, file_path, code_snippet, relevance_score, explanation_gpt, function_name, class_name, type)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'snippet')`,
          [
            issueId,
            snippet.file,
            snippet.code,
            snippet.relevance,
            snippet.explanation,
            null,
            null,
          ]
        );
      }
    }

    // AI 해결 제안 저장 (컬럼이 없을 경우 무시)
    if (solutionSuggestion) {
      try {
        await pool.query(
          'UPDATE issues SET solution_suggestion_gpt = ? WHERE issue_id = ?',
          [solutionSuggestion, issueId]
        );
      } catch (err) {
        if (
          err.message &&
          err.message.includes('Unknown column') &&
          err.message.includes('solution_suggestion_gpt')
        ) {
          // 컬럼이 없으면 무시
        } else {
          throw err;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('AI 분석 결과 저장 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 이슈의 AI 분석 상태 확인
async function checkIssueAnalysisStatus(issueId) {
  try {
    const [rows] = await pool.query(
      'SELECT summary_gpt FROM issues WHERE issue_id = ?',
      [issueId]
    );

    if (rows.length === 0) {
      return { success: false, error: '이슈를 찾을 수 없습니다.' };
    }

    const hasAnalysis =
      rows[0].summary_gpt && rows[0].summary_gpt.trim() !== '';
    return { success: true, hasAnalysis };
  } catch (error) {
    console.error('AI 분석 상태 확인 오류:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  selectIssuesByRepoId,
  selectIssuesByRepoIds,
  upsertIssues,
  upsertRecentIssue,
  selectRecentIssues,
  selectIssueDetail,
  selectIssueComments,
  selectRecommendedCodeSnippets,
  // === 관련 파일 추천 함수도 export ===
  selectRecommendedRelatedFiles,
  selectIssueDetailWithExtras,
  updateIssueAnalysis,
  checkIssueAnalysisStatus,
};
