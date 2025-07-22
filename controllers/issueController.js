import Issue from '../models/Issue.js';
import axios from 'axios';
import githubApiService from '../services/githubApiService.js'; // githubApiService 임포트

// Flask 서버 URL 설정
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:3002';

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
    // 쿠키에서 GitHub 액세스 토큰 추출
    const userGithubAccessToken = req.cookies.githubAccessToken;

    console.log(
      `이슈 분석 요청 - 저장소 ID: ${repoId}, 이슈 번호: ${issueNumber}, GitHub 토큰 사용: ${
        userGithubAccessToken ? '있음' : '없음'
      }`
    );

    // 1. 이슈 정보 조회
    const issueResult = await Issue.selectIssueDetail(repoId, issueNumber);
    if (!issueResult.success) {
      return res.status(404).json({ error: '이슈를 찾을 수 없습니다.' });
    }

    const issue = issueResult.data;

    if (!issue.repoUrl) {
      return res.status(400).json({
        error: '저장소 URL 정보를 찾을 수 없습니다.',
      });
    }

    // === 저장소 기본 브랜치명 조회 (토큰 전달) ===
    let defaultBranch = 'main';
    try {
      const repoInfo = await githubApiService.getRepositoryInfo(
        issue.repoUrl, // repoFullName 대신 전체 URL 사용
        userGithubAccessToken
      );
      if (repoInfo && repoInfo.defaultBranch) {
        defaultBranch = repoInfo.defaultBranch;
        console.log(
          `저장소 ${issue.repoFullName}의 기본 브랜치: ${defaultBranch}`
        );
      } else {
        console.warn(
          `저장소 ${issue.repoFullName}의 기본 브랜치 정보를 가져오지 못했습니다. 기본값 'main' 사용.`
        );
      }
    } catch (err) {
      console.error(
        `저장소 정보 조회 중 오류 발생 (${issue.repoFullName}): ${err.message}. 기본 브랜치 'main' 사용.`
      );
    }

    // 2. 이미 분석된 이슈인지 확인
    const statusResult = await Issue.checkIssueAnalysisStatus(issue.issueId);
    if (statusResult.success && statusResult.hasAnalysis) {
      const detailResult = await Issue.selectIssueDetailWithExtras(
        repoId,
        issueNumber
      );
      return res.json({
        success: true,
        message: '이미 분석된 이슈입니다.',
        alreadyAnalyzed: true,
        data: detailResult.success ? detailResult.data.aiAnalysis : {},
      });
    }

    // 3. Flask 서버에 분석 요청
    try {
      const requestUrl = `${FLASK_API_URL}/issue/analyze-issue`;
      const requestBody = {
        title: issue.title,
        body: issue.body || '',
        issueId: issue.issueId,
        repoUrl: issue.repoUrl,
        defaultBranch,
      };

      console.log(
        'Flask 서버에 분석 요청:',
        requestUrl,
        JSON.stringify(requestBody)
      );

      const analysisResponse = await axios.post(requestUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      });

      const analysisData = analysisResponse.data;

      // Flask 분석 결과 로그 출력
      if (
        analysisData.relatedFiles &&
        Array.isArray(analysisData.relatedFiles)
      ) {
        analysisData.relatedFiles.forEach((file, idx) => {
          console.log(
            `[CodeReview] Flask 분석 결과 관련 파일 ${idx + 1}: path=${
              file.path
            }, githubUrl=${file.githubUrl}`
          );
        });
      }

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

      // Flask에서 받은 분석 결과를 그대로 반환 (githubUrl 필드 보존)
      res.json({
        success: true,
        message: '이슈 분석이 완료되었습니다.',
        data: analysisData, // Flask 원본 결과 직접 사용
      });
    } catch (flaskError) {
      console.error('Flask 서버 통신 오류 발생:', flaskError);
      if (flaskError.response) {
        console.error('Flask 서버 응답 데이터:', flaskError.response.data);
        console.error('Flask 서버 응답 상태:', flaskError.response.status);
        console.error('Flask 서버 응답 헤더:', flaskError.response.headers);
      } else if (flaskError.request) {
        console.error('Flask 서버 요청 정보:', flaskError.request);
      } else {
        console.error('Flask 요청 설정 오류:', flaskError.message);
      }
      console.error('Flask 서버 통신 오류 메시지:', flaskError.message);
      console.error('Flask 서버 통신 오류 코드:', flaskError.code);

      if (flaskError.code === 'ECONNREFUSED') {
        console.error(
          'ECONNREFUSED: AI 분석 서버 연결 거부됨. FLASK_API_URL 확인:',
          FLASK_API_URL
        );
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
