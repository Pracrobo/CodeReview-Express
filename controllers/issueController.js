import Issue from '../models/Issue.js';
import axios from 'axios';

// Flask 서버 URL 설정
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';

// 여러 저장소의 이슈를 한 번에 조회
const getIssuesByRepoIds = async (req, res) => {
  try {
    const { repoIds, state, limit = 20, offset = 0, search } = req.query;

    if (!repoIds) {
      return res.status(400).json({ error: '저장소 ID가 필요합니다.' });
    }

    const repoIdArray = Array.isArray(repoIds) ? repoIds : repoIds.split(',');
    const result = await Issue.selectIssuesByRepoIds({
      repoIds: repoIdArray,
      state,
      limit: parseInt(limit),
      offset: parseInt(offset),
      search,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('이슈 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 최근 본 이슈 목록 조회
const getRecentIssues = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const result = await Issue.selectRecentIssues(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('최근 본 이슈 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 최근 본 이슈 저장
const saveRecentIssue = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { issueId } = req.params;

    const result = await Issue.upsertRecentIssue(userId, parseInt(issueId));

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true, message: '최근 본 이슈가 저장되었습니다.' });
  } catch (error) {
    console.error('최근 본 이슈 저장 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 이슈 AI 분석 수행
const analyzeIssue = async (req, res) => {
  try {
    const { repoId, issueNumber } = req.params;

    // 1. 이슈 정보 조회
    const issueResult = await Issue.selectIssueDetail(repoId, issueNumber);
    if (!issueResult.success) {
      return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });
    }

    const issue = issueResult.data;

    // 2. 이미 분석된 이슈인지 확인
    const statusResult = await Issue.checkIssueAnalysisStatus(issue.issueId);
    if (statusResult.success && statusResult.hasAnalysis) {
      return res.json({
        success: true,
        message: '이미 분석된 이슈입니다.',
        alreadyAnalyzed: true,
      });
    }

    // 3. Flask 서버에 분석 요청
    try {
      const analysisResponse = await axios.post(
        `${FLASK_API_URL}/api/analyze-issue`,
        {
          title: issue.title,
          body: issue.body || '',
          issueId: issue.issueId,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000, // 2분 타임아웃
        }
      );

      const analysisData = analysisResponse.data;

      // 4. 분석 결과를 DB에 저장
      const saveResult = await Issue.updateIssueAnalysis(
        issue.issueId,
        analysisData
      );
      if (!saveResult.success) {
        console.error('분석 결과 저장 실패:', saveResult.error);
        return res
          .status(500)
          .json({ error: '분석 결과 저장에 실패했습니다.' });
      }

      res.json({
        success: true,
        message: '이슈 분석이 완료되었습니다.',
        data: analysisData,
      });
    } catch (flaskError) {
      console.error('Flask 서버 통신 오류:', flaskError.message);

      if (flaskError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error:
            'AI 분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
        });
      }

      if (flaskError.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: '분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        });
      }

      return res.status(500).json({
        error: 'AI 분석 중 오류가 발생했습니다.',
      });
    }
  } catch (error) {
    console.error('이슈 분석 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export default {
  getIssuesByRepoIds,
  getRecentIssues,
  saveRecentIssue,
  analyzeIssue,
};
