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

import {
  ValidationError,
  validateGitHubRepoInfo,
  validateLanguagesData,
  validateAnalysisRequest,
} from '../utils/validators.js';

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
      success: true,
      repositories: repositories.data,
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

// 저장소 분석 시작
async function analyzeRepository(req, res) {
  const userId = req.user.id;

  try {
    // 1. 요청 데이터 종합 검증
    const validatedData = validateAnalysisRequest(req.body);
    const { repoUrl } = validatedData;

    console.log('저장소 분석 요청 검증 완료:', repoUrl);

    // 2. GitHub API로 저장소 정보 조회 및 검증
    console.log('GitHub 저장소 정보 조회 중:', repoUrl);
    const repositoryInfo = await githubApiService.getRepositoryInfo(repoUrl);

    // 3. GitHub 저장소 정보 종합 검증
    validateGitHubRepoInfo(repositoryInfo);

    // 4. 언어 정보 조회 및 검증
    console.log('저장소 언어 정보 조회 중:', repoUrl);
    const languagesData = await githubApiService.getRepositoryLanguages(
      repoUrl
    );
    validateLanguagesData(languagesData, repoUrl);

    // 5. 1시간 이내 분석 결과 확인
    const recentAnalysisResult = await Repository.checkRecentAnalysis(
      repositoryInfo.githubRepoId
    );

    if (
      recentAnalysisResult.success &&
      recentAnalysisResult.hasRecentAnalysis
    ) {
      console.log('1시간 이내 분석 결과 발견, Flask 요청 생략');

      const { repoId } = recentAnalysisResult.data;

      // README 요약이 없는 경우 백그라운드에서 처리
      if (!recentAnalysisResult.data.readmeSummaryGpt) {
        console.log(
          '기존 분석 결과에 README 요약이 없어 백그라운드에서 처리 시작'
        );

        setImmediate(async () => {
          try {
            // GitHub에서 README 조회
            const readmeData = await githubApiService.getRepositoryReadme(
              repoUrl
            );

            if (readmeData && readmeData.content) {
              console.log(`README 조회 성공: ${repositoryInfo.fullName}`);

              // Flask에 README 요약 요청
              const summaryResult = await flaskService.requestReadmeSummary(
                repositoryInfo.fullName,
                readmeData.content
              );

              if (summaryResult.success && summaryResult.data.summary) {
                // DB에 README 요약 저장
                await Repository.updateRepositoryAnalysisStatus(repoId, {
                  readmeSummaryGpt: summaryResult.data.summary,
                });
                console.log(
                  `README 요약 완료 및 저장: ${repositoryInfo.fullName}`
                );
              } else {
                console.warn(
                  `README 요약 실패: ${repositoryInfo.fullName}`,
                  summaryResult.error
                );
              }
            } else {
              console.log(
                `README 파일을 찾을 수 없습니다: ${repositoryInfo.fullName}`
              );
            }
          } catch (error) {
            console.error(
              `README 요약 백그라운드 처리 중 오류: ${repositoryInfo.fullName}`,
              error
            );
          }
        });
      }

      // Description 번역 처리 (기존 분석 결과 사용 시)
      let shouldUpdateDescription = false;
      let translatedDescription = repositoryInfo.description;

      // 현재 DB의 description과 GitHub의 description이 다르거나, 영어인 경우 번역 처리
      if (repositoryInfo.description && repositoryInfo.description.trim()) {
        const currentDescription = recentAnalysisResult.data.description;

        // GitHub description이 변경되었거나, 현재 DB의 description이 영어인 것 같은 경우
        if (
          currentDescription !== repositoryInfo.description ||
          (currentDescription && _isLikelyEnglish(currentDescription))
        ) {
          setImmediate(async () => {
            try {
              console.log(
                `Description 번역 시작 (기존 분석): ${repositoryInfo.fullName}`
              );

              const translationResult = await flaskService.requestTranslation(
                repositoryInfo.description,
                'auto',
                'ko'
              );

              if (
                translationResult.success &&
                translationResult.data.translated_text
              ) {
                // DB에 번역된 description 저장
                await Repository.updateRepositoryAnalysisStatus(repoId, {
                  description: translationResult.data.translated_text,
                });
                console.log(
                  `Description 번역 완료 및 저장: ${repositoryInfo.fullName}`
                );
                console.log(
                  `원본: "${repositoryInfo.description}" -> 번역: "${translationResult.data.translated_text}"`
                );
              } else {
                console.warn(
                  `Description 번역 실패: ${repositoryInfo.fullName}`,
                  translationResult.error
                );
                // 번역 실패 시 원본 description으로 업데이트
                await Repository.updateRepositoryAnalysisStatus(repoId, {
                  description: repositoryInfo.description,
                });
                console.log(
                  `번역 실패로 원본 description 저장: ${repositoryInfo.fullName}`
                );
              }
            } catch (error) {
              console.error(
                `Description 번역 백그라운드 처리 중 오류: ${repositoryInfo.fullName}`,
                error
              );
            }
          });
        }
      }

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

    // 6. README 요약 처리 (새로운 분석인 경우)
    let readmeSummary = null;
    try {
      console.log(`README 조회 시작: ${repositoryInfo.fullName}`);
      const readmeData = await githubApiService.getRepositoryReadme(repoUrl);

      if (readmeData && readmeData.content) {
        console.log(`README 조회 성공: ${repositoryInfo.fullName}`);

        // Flask에 README 요약 요청
        const summaryResult = await flaskService.requestReadmeSummary(
          repositoryInfo.fullName,
          readmeData.content
        );

        if (summaryResult.success && summaryResult.data.summary) {
          readmeSummary = summaryResult.data.summary;
          console.log(`README 요약 완료: ${repositoryInfo.fullName}`);
        } else {
          console.warn(
            `README 요약 실패: ${repositoryInfo.fullName}`,
            summaryResult.error
          );
        }
      } else {
        console.log(
          `README 파일을 찾을 수 없습니다: ${repositoryInfo.fullName}`
        );
      }
    } catch (error) {
      console.error(`README 처리 중 오류: ${repositoryInfo.fullName}`, error);
      // README 처리 실패는 전체 분석을 막지 않음
    }

    // 7. Description 번역 처리
    let translatedDescription = repositoryInfo.description;
    if (repositoryInfo.description && repositoryInfo.description.trim()) {
      try {
        console.log(`Description 번역 시작: ${repositoryInfo.fullName}`);

        const translationResult = await flaskService.requestTranslation(
          repositoryInfo.description,
          'auto',
          'ko'
        );

        if (
          translationResult.success &&
          translationResult.data.translated_text
        ) {
          translatedDescription = translationResult.data.translated_text;
          console.log(`Description 번역 완료: ${repositoryInfo.fullName}`);
        } else {
          console.warn(
            `Description 번역 실패: ${repositoryInfo.fullName}`,
            translationResult.error
          );
          // 번역 실패 시 원본 텍스트 사용
          translatedDescription =
            translationResult.originalText || repositoryInfo.description;
        }
      } catch (error) {
        console.error(
          `Description 번역 중 오류: ${repositoryInfo.fullName}`,
          error
        );
        // 번역 실패는 전체 분석을 막지 않음, 원본 description 사용
      }
    }

    // 8. 저장소 정보를 DB에 저장/업데이트 (README 요약 및 번역된 description 포함)
    const upsertResult = await Repository.upsertRepository({
      githubRepoId: repositoryInfo.githubRepoId,
      fullName: repositoryInfo.fullName,
      description: translatedDescription, // 번역된 description 사용
      htmlUrl: repositoryInfo.htmlUrl,
      licenseSpdxId: repositoryInfo.licenseSpdxId,
      star: repositoryInfo.star,
      fork: repositoryInfo.fork,
      issueTotalCount: repositoryInfo.openIssuesCount,
      readmeSummaryGpt: readmeSummary, // README 요약 포함
    });

    if (!upsertResult.success) {
      return res.status(500).json({
        success: false,
        message: '저장소 정보 저장 중 오류가 발생했습니다.',
        errorType: 'DATABASE_ERROR',
      });
    }

    const { repoId } = upsertResult.data;

    // 9. 분석 상태를 'analyzing'으로 설정
    const analysisStartResult = await Repository.startRepositoryAnalysis(
      repoId
    );

    if (!analysisStartResult.success) {
      return res.status(500).json({
        success: false,
        message: '분석 상태 설정 중 오류가 발생했습니다.',
        errorType: 'DATABASE_ERROR',
      });
    }

    // 10. 사용자 트래킹에 추가
    await Repository.insertTrack(userId, repoId);

    // 11. Flask 서버에 인덱싱 요청 (비동기)
    setImmediate(async () => {
      try {
        // 분석 상태 업데이트
        await Repository.updateRepositoryAnalysisStatus(repoId, {
          analysisCurrentStep: 'Flask 서버에서 인덱싱 중...',
        });

        const flaskResult = await flaskService.requestRepositoryIndexing(
          repoUrl,
          repositoryInfo,
          userId
        );

        if (flaskResult.success) {
          // Flask에서 성공적으로 시작된 경우
          await Repository.updateRepositoryAnalysisStatus(repoId, {
            analysisCurrentStep: '저장소 분석 진행 중...',
          });
        } else {
          // Flask 요청 실패 - 구체적인 오류 메시지 처리
          let errorMessage = 'Flask 서버 오류';
          let errorType = 'FLASK_ERROR';

          if (flaskResult.error) {
            errorMessage = flaskResult.error;

            // 오류 타입 분류
            if (flaskResult.error.includes('크기가 제한을 초과')) {
              errorType = 'REPOSITORY_SIZE_EXCEEDED';
            } else if (flaskResult.error.includes('연결할 수 없습니다')) {
              errorType = 'FLASK_CONNECTION_ERROR';
            } else if (flaskResult.error.includes('타임아웃')) {
              errorType = 'FLASK_TIMEOUT_ERROR';
            }
          }

          await Repository.updateRepositoryAnalysisStatus(repoId, {
            analysisStatus: 'failed',
            analysisErrorMessage: errorMessage,
            analysisCurrentStep: '분석 실패',
          });

          console.error(
            `Flask 요청 실패 - ${repositoryInfo.fullName}: ${errorMessage}`
          );
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

    // 12. 즉시 응답 반환
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

    // ValidationError 처리
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errorType: error.errorType,
      });
    }

    // GitHub API 오류 처리
    if (error.message.includes('저장소를 찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: '저장소를 찾을 수 없습니다. URL이 올바른지 확인해주세요.',
        errorType: 'REPOSITORY_NOT_FOUND',
      });
    } else if (error.message.includes('접근할 권한이 없습니다')) {
      return res.status(403).json({
        success: false,
        message:
          '저장소에 접근할 권한이 없습니다. 공개 저장소인지 확인해주세요.',
        errorType: 'REPOSITORY_ACCESS_DENIED',
      });
    } else if (error.message.includes('GitHub 인증이 필요합니다')) {
      return res.status(401).json({
        success: false,
        message: 'GitHub 인증이 필요합니다. 잠시 후 다시 시도해주세요.',
        errorType: 'GITHUB_AUTH_REQUIRED',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || '저장소 분석 시작 중 오류가 발생했습니다.',
      errorType: 'INTERNAL_ERROR',
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
            // Flask에서 받은 추가 정보들
            estimatedCompletion: flaskData.estimated_completion,
            etaText: flaskData.eta_text || '계산 중...',
          });
        }
      } catch (flaskError) {
        console.warn('Flask 상태 확인 중 오류:', flaskError.message);

        // Flask에서 409 에러가 발생한 경우 (분석 실패)
        if (flaskError.response?.status === 409) {
          console.log('Flask에서 분석 실패 상태 감지, DB 상태 업데이트');

          let errorMessage = 'Flask 서버에서 분석 실패';
          let errorType = 'FLASK_ERROR';

          // Flask 응답에서 구체적인 오류 메시지 추출
          if (flaskError.response?.data?.message) {
            errorMessage = flaskError.response.data.message;

            // 오류 타입 분류
            if (errorMessage.includes('크기가 제한을 초과')) {
              errorType = 'REPOSITORY_SIZE_EXCEEDED';
            } else if (errorMessage.includes('권한')) {
              errorType = 'REPOSITORY_ACCESS_DENIED';
            } else if (errorMessage.includes('찾을 수 없습니다')) {
              errorType = 'REPOSITORY_NOT_FOUND';
            }
          }

          const failureUpdateData = {
            analysisStatus: 'failed',
            analysisProgress: 0,
            analysisCurrentStep: '분석 실패',
            analysisErrorMessage: errorMessage,
          };

          await Repository.updateRepositoryAnalysisStatus(
            result.data.repoId,
            failureUpdateData
          );

          // 응답 데이터 업데이트
          Object.assign(result.data, {
            status: 'failed',
            progress: 0,
            currentStep: '분석 실패',
            errorMessage: errorMessage,
            errorType: errorType,
            etaText: '실패',
          });
        }
      }
    }

    // 실패 상태인 경우 오류 타입 추가
    if (result.data.status === 'failed' && result.data.errorMessage) {
      let errorType = 'UNKNOWN_ERROR';
      const errorMessage = result.data.errorMessage;

      if (errorMessage.includes('크기가 제한을 초과')) {
        errorType = 'REPOSITORY_SIZE_EXCEEDED';
      } else if (errorMessage.includes('권한')) {
        errorType = 'REPOSITORY_ACCESS_DENIED';
      } else if (errorMessage.includes('찾을 수 없습니다')) {
        errorType = 'REPOSITORY_NOT_FOUND';
      } else if (errorMessage.includes('Flask')) {
        errorType = 'FLASK_ERROR';
      } else if (errorMessage.includes('연결')) {
        errorType = 'CONNECTION_ERROR';
      }

      result.data.errorType = errorType;
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

// 저장소 조회 시 마지막 조회 시간 업데이트
async function updateRepositoryLastViewed(req, res) {
  const userId = req.user.id;
  const { repoId } = req.params;

  if (!repoId) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID가 필요합니다.',
    });
  }

  try {
    const result = await Repository.updateLastViewedAt(userId, repoId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '마지막 조회 시간 업데이트 중 오류가 발생했습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      message: '마지막 조회 시간이 업데이트되었습니다.',
    });
  } catch (error) {
    console.error('마지막 조회 시간 업데이트 오류:', error);
    return res.status(500).json({
      success: false,
      message: '마지막 조회 시간 업데이트 중 오류가 발생했습니다.',
    });
  }
}

// 저장소 상세 정보 조회
async function getRepositoryDetails(req, res) {
  const userId = req.user.id;
  const { repoId } = req.params;

  if (!repoId) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID가 필요합니다.',
    });
  }

  try {
    // 저장소 상세 정보 조회
    const result = await Repository.selectRepositoryDetails(repoId, userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || '저장소를 찾을 수 없습니다.',
      });
    }

    // 저장소 언어 정보 조회
    const languagesResult = await Repository.selectRepositoryLanguages(repoId);

    // 언어 정보를 저장소 데이터에 추가
    const repositoryData = {
      ...result.data,
      languages: languagesResult.success ? languagesResult.data : [],
    };

    // 사용자가 트래킹 중인 저장소라면 last_viewed_at 업데이트
    if (result.data.isTracked) {
      await Repository.updateLastViewedAt(userId, repoId);
    }

    return res.status(200).json({
      success: true,
      data: repositoryData,
      message: '저장소 상세 정보를 성공적으로 조회했습니다.',
    });
  } catch (error) {
    console.error('저장소 상세 정보 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '저장소 상세 정보 조회 중 오류가 발생했습니다.',
    });
  }
}

// 저장소 언어 정보 조회
async function getRepositoryLanguages(req, res) {
  const { repoId } = req.params;

  if (!repoId) {
    return res.status(400).json({
      success: false,
      message: '저장소 ID가 필요합니다.',
    });
  }

  try {
    const result = await Repository.selectRepositoryLanguages(repoId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '저장소 언어 정보 조회 중 오류가 발생했습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: '저장소 언어 정보를 성공적으로 조회했습니다.',
    });
  } catch (error) {
    console.error('저장소 언어 정보 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '저장소 언어 정보 조회 중 오류가 발생했습니다.',
    });
  }
}

// 헬퍼 함수: 텍스트가 영어인지 간단히 판별
function _isLikelyEnglish(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 한글 문자가 있으면 한국어로 판단
  const koreanRegex = /[\uac00-\ud7af]/;
  if (koreanRegex.test(text)) {
    return false;
  }

  // 영어 알파벳이 전체 문자의 50% 이상이면 영어로 판단
  const englishChars = text.match(/[a-zA-Z]/g);
  const totalChars = text.replace(/\s/g, '').length;

  if (totalChars === 0) {
    return false;
  }

  const englishRatio = englishChars ? englishChars.length / totalChars : 0;
  return englishRatio >= 0.5;
}

// 즐겨찾기 상태 업데이트
export async function updateFavoriteStatus(req, res) {
  const { repoId } = req.params;
  const { isFavorite } = req.body;
  const userId = req.user.id;

  try {
    const result = await Repository.updateFavoriteStatus(
      userId,
      repoId,
      isFavorite
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: '즐겨찾기 상태가 업데이트되었습니다.',
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: '즐겨찾기 상태 업데이트 실패' });
    }
  } catch (error) {
    console.error('즐겨찾기 상태 업데이트 오류:', error.message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
}

export default {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  analyzeRepository,
  getAnalyzingRepositories,
  getRecentlyAnalyzedRepositories,
  getAnalysisStatus,
  updateRepositoryLastViewed,
  getRepositoryDetails,
  getRepositoryLanguages,
  updateFavoriteStatus,
};
