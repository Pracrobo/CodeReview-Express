import Database from '../database/database.js';
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

// 이슈 댓글 조회 함수 추가
async function selectIssueComments(repoId, githubIssueNumber) {
  try {
    // GitHub API에서 댓글을 가져오거나 DB에 저장된 댓글을 조회
    // 임시로 빈 배열 반환 (실제로는 GitHub API 연동 필요)
    return { success: true, data: [] };
  } catch (error) {
    console.error('이슈 댓글 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// AI 코드 스니펫 추천 조회
async function selectRecommendedCodeSnippets(issueId) {
  try {
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
       WHERE issue_id = ? 
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
    };
    return { success: true, data };
  } catch (error) {
    console.error('이슈 상세 조회 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 이슈 상세 조회 (댓글 및 AI 분석 포함)
async function selectIssueDetailWithExtras(repoId, githubIssueNumber) {
  try {
    // 기본 이슈 정보 조회
    const issueResult = await selectIssueDetail(repoId, githubIssueNumber);
    if (!issueResult.success) {
      return issueResult;
    }

    const issue = issueResult.data;

    // 댓글 조회
    const commentsResult = await selectIssueComments(repoId, githubIssueNumber);
    const comments = commentsResult.success ? commentsResult.data : [];

    // AI 코드 스니펫 조회
    const snippetsResult = await selectRecommendedCodeSnippets(issue.issueId);
    const codeSnippets = snippetsResult.success ? snippetsResult.data : [];

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
          relatedFiles: [], // 추후 확장
          suggestion: '', // 추후 확장
        },
      },
    };
  } catch (error) {
    console.error('이슈 상세 조회 (확장) 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// AI 분석 결과 저장 (issueId, 분석 결과)
async function saveAiAnalysisResult(issueId, aiData) {
  try {
    await pool.query(
      `UPDATE issues SET summary_gpt = ?, tags_gpt_json = ? WHERE issue_id = ?`,
      [aiData.summary || '', JSON.stringify(aiData.labels || []), issueId]
    );
    // 코드 스니펫/파일 등은 recommended_code_snippets 테이블에 저장 (예시)
    if (aiData.codeSnippets && aiData.codeSnippets.length > 0) {
      for (const snippet of aiData.codeSnippets) {
        await pool.query(
          `INSERT INTO recommended_code_snippets (issue_id, file_path, function_name, class_name, code_snippet, relevance_score, explanation_gpt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            issueId,
            snippet.file || '',
            snippet.functionName || '',
            snippet.className || '',
            snippet.code || '',
            snippet.relevance || 0,
            snippet.explanation || '',
          ]
        );
      }
    }
    return { success: true };
  } catch (error) {
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
  selectIssueDetailWithExtras,
  saveAiAnalysisResult,
};
