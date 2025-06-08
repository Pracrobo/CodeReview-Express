import IssueModel from '../models/Issue.js';

// 여러 저장소의 이슈를 한 번에 조회 (GET, 쿼리스트링)
async function getIssuesByRepoIds(req, res) {
  let repoIds = req.query.repoIds;
  if (!repoIds) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID 목록이 필요합니다.',
    });
  }
  if (!Array.isArray(repoIds)) {
    repoIds = [repoIds];
  }
  repoIds = repoIds.map((id) => Number(id)).filter((id) => !isNaN(id));
  const state = req.query.state || null;
  const search = req.query.search || '';
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  if (repoIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID 목록이 필요합니다.',
    });
  }
  try {
    const result = await IssueModel.selectIssuesByRepoIds({
      repoIds,
      state,
      limit,
      offset,
      search,
    });
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '이슈 목록 조회 중 오류가 발생했습니다.',
      });
    }
    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.data.length === 0 ? '이슈가 없습니다.' : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '이슈 목록 조회 중 오류가 발생했습니다.',
    });
  }
}

// 최근 본 이슈 목록 조회
async function getRecentIssues(req, res) {
  const userId = req.user.userId;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const result = await IssueModel.selectRecentIssues(userId, limit, offset);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '최근 본 이슈 조회 중 오류가 발생했습니다.',
      });
    }
    return res.status(200).json({
      success: true,
      data: result.data,
      message:
        result.data.length === 0 ? '최근 본 이슈가 없습니다.' : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '최근 본 이슈 조회 중 오류가 발생했습니다.',
    });
  }
}

// 최근 본 이슈 저장
async function saveRecentIssue(req, res) {
  const userId = req.user.userId;
  const { issueId } = req.params;
  if (!issueId) {
    return res.status(400).json({
      success: false,
      message: '이슈 ID가 필요합니다.',
    });
  }
  try {
    const result = await IssueModel.upsertRecentIssue(userId, issueId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '최근 본 이슈 저장 중 오류가 발생했습니다.',
      });
    }
    return res.status(200).json({
      success: true,
      message: '최근 본 이슈로 저장되었습니다.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '최근 본 이슈 저장 중 오류가 발생했습니다.',
    });
  }
}

export default {
  getIssuesByRepoIds,
  getRecentIssues,
  saveRecentIssue,
};
