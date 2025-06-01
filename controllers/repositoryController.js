import {
  searchRepositories,
  getUserRepositories,
  addRepositoryToTracking,
  checkUserTrackingStatus,
  removeRepositoryFromTracking,
} from '../services/repositoryService.js'; // 경로 수정

// 새로 추가된 서비스들
import { githubApiService } from '../services/githubApiService.js';
import { flaskService } from '../services/flaskService.js';
import Repository from '../models/Repository.js';

// 저장소 검색
async function searchRepository(req, res) {
  // req.user는 authenticate 미들웨어를 통해 주입됨
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: '검색어를 입력해주세요.',
    });
  }

  try {
    const result = await searchRepositories(query);
    if (result.success) {
      return res.status(200).json({
        success: true,
        repositories: result.data,
        message: result.data.length === 0 ? '검색 결과가 없습니다.' : null,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('저장소 검색 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '저장소 검색 중 오류가 발생했습니다.',
    });
  }
}

// 내 저장소 목록 조회
async function getRepositoryList(req, res) {
  const userId = req.user.id; // authenticate 미들웨어에서 주입된 사용자 ID
  try {
    const repositories = await getUserRepositories(userId);
    return res.status(200).json({
      data: repositories.data,
      message:
        repositories.data.length === 0 ? '추적 중인 저장소가 없습니다.' : null,
    });
  } catch (error) {
    console.error('저장소 목록 조회 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '트래킹된 저장소 목록 조회 중 오류가 발생했습니다.',
    });
  }
}

// '내 저장소'에 특정 저장소 추가
async function addRepositoryInTracker(req, res) {
  const userId = req.user.id; // authenticate 미들웨어에서 주입된 사용자 ID
  const githubRepoId = req.body.githubRepoId; // 요청 본문에서 githubRepoId를 받도록 변경 (또는 req.query 유지)
  if (!githubRepoId) {
    return res.status(400).json({
      success: false,
      message: 'GitHub repository의 repo_id가 필요합니다.',
    });
  }

  try {
    const result = await checkUserTrackingStatus(userId, githubRepoId);
    if (result.tracked) {
      return res.status(409).json({
        success: false,
        message: '이미 트래킹 중인 저장소입니다.',
      });
    }

    const repositories = await addRepositoryToTracking(userId, githubRepoId);

    return res.status(201).json({
      success: true,
      data: repositories.data,
      message: '저장소가 성공적으로 추가되었습니다.',
    });
  } catch (error) {
    console.error('저장소 추가 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '트래킹 저장소 추가 중 오류가 발생했습니다.',
    });
  }
}

// '내 저장소'에서 특정 저장소 삭제
async function deleteRepositoryInTracker(req, res) {
  const userId = req.user.id; // authenticate 미들웨어에서 주입된 사용자 ID
  const { githubRepoId } = req.query; // 삭제는 주로 query parameter나 path parameter 사용
  if (!githubRepoId) {
    return res.status(400).json({
      success: false,
      message: '삭제할 GitHub 저장소 ID가 필요합니다.',
    });
  }

  try {
    const deleteResponse = await removeRepositoryFromTracking(
      userId,
      githubRepoId
    );

    if (deleteResponse.data.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: '저장소가 성공적으로 삭제되었습니다.',
      });
    } else {
      return res.status(404).json({
        success: false,
        message: '삭제할 저장소를 찾을 수 없습니다.',
      });
    }
  } catch (error) {
    console.error('저장소 삭제 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '트래킹 저장소 삭제 중 오류가 발생했습니다.',
    });
  }
}

// 저장소 분석 시작
async function analyzeRepository(req, res) {
  const userId = req.user.id;
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({
      success: false,
      message: '저장소 URL이 필요합니다.',
    });
  }

  // GitHub URL 형식 검증
  const githubUrlPattern =
    /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/;
  if (!githubUrlPattern.test(repoUrl.trim())) {
    return res.status(400).json({
      success: false,
      message: '유효한 GitHub 저장소 URL을 입력해주세요.',
    });
  }

  try {
    // 1. GitHub API로 저장소 정보 조회
    console.log('GitHub 저장소 정보 조회 중:', repoUrl);
    const repositoryInfo = await githubApiService.getRepositoryInfo(repoUrl);

    // 2. 1시간 이내 분석 결과 확인
    const recentAnalysisResult = await Repository.checkRecentAnalysis(
      repositoryInfo.githubRepoId
    );

    if (
      recentAnalysisResult.success &&
      recentAnalysisResult.hasRecentAnalysis
    ) {
      console.log('1시간 이내 분석 결과 발견, Flask 요청 생략');

      const { repoId } = recentAnalysisResult.data;

      // 사용자 트래킹에 추가
      await Repository.insertTrack(userId, repoId);

      return res.status(200).json({
        success: true,
        message: '최근 분석된 결과를 사용합니다.',
        data: {
          repositoryId: repoId,
          name: repositoryInfo.name,
          fullName: repositoryInfo.fullName,
          description: repositoryInfo.description,
          status: 'completed',
          progress: 100,
          startedAt: recentAnalysisResult.data.analysisCompletedAt,
          completedAt: recentAnalysisResult.data.analysisCompletedAt,
          isRecentResult: true,
        },
      });
    }

    // 3. 저장소 정보를 DB에 저장/업데이트
    const upsertResult = await Repository.upsertRepository({
      githubRepoId: repositoryInfo.githubRepoId,
      fullName: repositoryInfo.fullName,
      description: repositoryInfo.description,
      htmlUrl: repositoryInfo.htmlUrl,
      programmingLanguage: repositoryInfo.programmingLanguage,
      licenseSpdxId: repositoryInfo.licenseSpdxId,
      star: repositoryInfo.star,
      fork: repositoryInfo.fork,
      issueTotalCount: repositoryInfo.openIssuesCount,
    });

    if (!upsertResult.success) {
      return res.status(500).json({
        success: false,
        message: '저장소 정보 저장 중 오류가 발생했습니다.',
      });
    }

    const { repoId } = upsertResult.data;

    // 4. 분석 상태를 'analyzing'으로 설정
    const analysisStartResult = await Repository.startRepositoryAnalysis(
      repoId
    );

    if (!analysisStartResult.success) {
      return res.status(500).json({
        success: false,
        message: '분석 상태 설정 중 오류가 발생했습니다.',
      });
    }

    // 5. 사용자 트래킹에 추가
    await Repository.insertTrack(userId, repoId);

    // 6. Flask 서버에 인덱싱 요청 (비동기)
    setImmediate(async () => {
      try {
        // 분석 상태 업데이트
        await Repository.updateRepositoryAnalysisStatus(repoId, {
          analysisCurrentStep: 'Flask 서버에서 인덱싱 중...',
        });

        const flaskResult = await flaskService.requestRepositoryIndexing(
          repoUrl,
          repositoryInfo
        );

        if (flaskResult.success) {
          // Flask에서 성공적으로 시작된 경우
          await Repository.updateRepositoryAnalysisStatus(repoId, {
            analysisCurrentStep: '저장소 분석 진행 중...',
          });
        } else {
          // Flask 요청 실패
          await Repository.updateRepositoryAnalysisStatus(repoId, {
            analysisStatus: 'failed',
            analysisErrorMessage: flaskResult.error || 'Flask 서버 오류',
            analysisCurrentStep: '분석 실패',
          });
        }
      } catch (error) {
        console.error('Flask 인덱싱 요청 중 오류:', error);
        await Repository.updateRepositoryAnalysisStatus(repoId, {
          analysisStatus: 'failed',
          analysisErrorMessage: '인덱싱 요청 중 오류가 발생했습니다.',
          analysisCurrentStep: '분석 실패',
        });
      }
    });

    // 7. 즉시 응답 반환
    return res.status(200).json({
      success: true,
      message: '저장소 분석이 시작되었습니다.',
      data: {
        repositoryId: repoId,
        name: repositoryInfo.name,
        fullName: repositoryInfo.fullName,
        description: repositoryInfo.description,
        status: 'analyzing',
        progress: 0,
        startedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 30 * 60000).toISOString(),
        isRecentResult: false,
      },
    });
  } catch (error) {
    console.error('저장소 분석 시작 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '저장소 분석 시작 중 오류가 발생했습니다.',
    });
  }
}

// 분석 중인 저장소 목록 조회
async function getAnalyzingRepositories(req, res) {
  const userId = req.user.id;

  try {
    const result = await Repository.selectAnalyzingRepositories(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '분석 중인 저장소 조회 중 오류가 발생했습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      repositories: result.data,
      message: result.data.length === 0 ? '분석 중인 저장소가 없습니다.' : null,
    });
  } catch (error) {
    console.error('분석 중인 저장소 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '분석 중인 저장소 조회 중 오류가 발생했습니다.',
    });
  }
}

// 최근 분석 완료된 저장소 목록 조회
async function getRecentlyAnalyzedRepositories(req, res) {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await Repository.selectRecentlyAnalyzedRepositories(
      userId,
      limit
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '최근 분석 완료 저장소 조회 중 오류가 발생했습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      repositories: result.data,
      message:
        result.data.length === 0 ? '분석 완료된 저장소가 없습니다.' : null,
    });
  } catch (error) {
    console.error('최근 분석 완료 저장소 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '최근 분석 완료 저장소 조회 중 오류가 발생했습니다.',
    });
  }
}

// 특정 저장소의 분석 상태 조회
async function getAnalysisStatus(req, res) {
  const userId = req.user.id;
  const { repositoryId } = req.params;

  if (!repositoryId) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID가 필요합니다.',
    });
  }

  try {
    const result = await Repository.selectRepositoryAnalysisStatus(
      repositoryId,
      userId
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || '분석 상태를 찾을 수 없습니다.',
      });
    }

    // Flask 서버에서 최신 상태 확인 (분석 중인 경우만)
    if (result.data.status === 'analyzing') {
      try {
        const flaskStatus = await flaskService.getRepositoryAnalysisStatus(
          result.data.name
        );
        if (flaskStatus.success && flaskStatus.data?.data) {
          // Flask에서 받은 상태로 업데이트
          const flaskData = flaskStatus.data.data;
          const updateData = {
            analysisProgress: flaskData.progress || result.data.progress,
            analysisCurrentStep:
              flaskData.current_step || result.data.currentStep,
          };

          if (flaskData.status === 'completed') {
            updateData.analysisStatus = 'completed';
            updateData.analysisProgress = 100;
          } else if (flaskData.status === 'failed') {
            updateData.analysisStatus = 'failed';
            updateData.analysisErrorMessage = flaskData.error || '분석 실패';
          }

          await Repository.updateRepositoryAnalysisStatus(
            result.data.repoId,
            updateData
          );

          // 업데이트된 데이터를 응답에 반영
          Object.assign(result.data, {
            status: updateData.analysisStatus || result.data.status,
            progress: updateData.analysisProgress || result.data.progress,
            currentStep:
              updateData.analysisCurrentStep || result.data.currentStep,
            errorMessage:
              updateData.analysisErrorMessage || result.data.errorMessage,
          });
        }
      } catch (flaskError) {
        console.warn('Flask 상태 확인 중 오류:', flaskError.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('분석 상태 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '분석 상태 조회 중 오류가 발생했습니다.',
    });
  }
}

export {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  deleteRepositoryInTracker,
  analyzeRepository,
  getAnalyzingRepositories,
  getRecentlyAnalyzedRepositories,
  getAnalysisStatus,
};
