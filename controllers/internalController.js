import Repository from '../models/Repository.js';
import notificationController from '../controllers/notificationController.js';
import GithubApiService from '../services/githubApiService.js';
import Validators from '../utils/validators.js';
import emailService from '../services/emailService.js';

const { ValidationError, validateLanguagesData } = Validators;

// Flask에서 분석 완료 콜백 처리
async function handleAnalysisComplete(req, res) {
  try {
    const {
      repo_name: repoName,
      status,
      error_message: errorMessage,
      user_id: userId,
    } = req.body;
    console.log('Flask 콜백 요청 받음:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });

    // 기본 검증
    if (!repoName) {
      console.error('repoName이 누락됨:', req.body);
      return res.status(400).json({
        success: false,
        message: '저장소 이름이 필요합니다.',
        errorType: 'MISSING_REPO_NAME',
      });
    }

    if (!status) {
      console.error('status가 누락됨:', req.body);
      return res.status(400).json({
        success: false,
        message: '분석 상태가 필요합니다.',
        errorType: 'MISSING_STATUS',
      });
    }

    console.log(`Flask에서 분석 완료 콜백 받음: ${repoName}, 상태: ${status}`);

    // GitHub URL 구성
    const repoUrl = `https://github.com/${repoName}`;
    console.log(`구성된 GitHub URL: ${repoUrl}`);

    try {
      // 저장소 정보 조회
      const repositoryInfo = await GithubApiService.getRepositoryInfo(repoUrl);

      if (!repositoryInfo) {
        console.error(`저장소 정보를 찾을 수 없습니다: ${repoName}`);
        return res.status(404).json({
          success: false,
          message: '저장소 정보를 찾을 수 없습니다.',
          errorType: 'REPOSITORY_NOT_FOUND',
        });
      }

      console.log(
        `저장소 정보 조회 성공: ${repoName}, GitHub ID: ${repositoryInfo.githubRepoId}`
      );

      // DB에서 저장소 조회
      const repoResult = await Repository.selectRepositoryByGithubId(
        repositoryInfo.githubRepoId
      );

      if (!repoResult.success || !repoResult.data) {
        console.error(`DB에서 저장소를 찾을 수 없습니다: ${repoName}`);
        return res.status(404).json({
          success: false,
          message: 'DB에서 저장소를 찾을 수 없습니다.',
          errorType: 'REPOSITORY_NOT_FOUND_IN_DB',
        });
      }

      const repoId = repoResult.data.id;
      console.log(`DB에서 저장소 조회 성공: ${repoName}, DB ID: ${repoId}`);

      if (status === 'completed') {
        console.log(`분석 완료 처리 시작: ${repoName}`);

        try {
          // 언어 정보 조회 및 검증
          const languagesData = await GithubApiService.getRepositoryLanguages(
            repoUrl
          );
          validateLanguagesData(languagesData, repoUrl);

          // 언어 정보를 DB에 저장
          if (languagesData && Object.keys(languagesData).length > 0) {
            console.log(`언어 정보 저장 중: ${repoName}`, languagesData);

            // 언어 정보를 배열로 변환하여 저장
            const languageEntries = Object.entries(languagesData).map(
              ([language, bytes]) => ({
                language_name: language,
                bytes_count: bytes,
                percentage: 0, // 백분율은 나중에 계산
              })
            );

            // 총 바이트 수 계산
            const totalBytes = Object.values(languagesData).reduce(
              (sum, bytes) => sum + bytes,
              0
            );

            // 백분율 계산
            languageEntries.forEach((entry) => {
              entry.percentage =
                totalBytes > 0 ? (entry.bytes_count / totalBytes) * 100 : 0;
            });

            // 언어 정보 저장
            const languageResult = await Repository.upsertRepositoryLanguages(
              repoId,
              languageEntries
            );

            if (languageResult.success) {
              console.log(`언어 정보 저장 완료: ${repoName}`);
            } else {
              console.error(
                `언어 정보 저장 실패: ${repoName}`,
                languageResult.error
              );
            }
          } else {
            console.log(`언어 정보가 없습니다: ${repoName}`);
          }
        } catch (languageError) {
          console.error(`언어 정보 처리 중 오류: ${repoName}`, languageError);
          // 언어 정보 처리 실패는 전체 분석 완료를 막지 않음
        }

        // 라이선스 정보 조회 (빠른 처리)
        let licenseInfo = null;
        try {
          console.log(`라이선스 정보 조회 시작: ${repoName}`);
          const licenseData = await GithubApiService.getRepositoryLicense(
            repoUrl
          );
          if (licenseData && licenseData.license) {
            const licenseSpdxId = licenseData.license.spdxId;
            console.log(
              `GitHub에서 라이선스 정보 조회: ${repoName} - ${licenseSpdxId}`
            );

            // 라이선스 존재 여부 확인
            const licenseCheck = await Repository.checkLicenseExists(
              licenseSpdxId
            );
            if (licenseCheck.exists) {
              licenseInfo = licenseSpdxId;
              console.log(`라이선스 검증 성공: ${repoName} - ${licenseInfo}`);
            } else {
              console.warn(
                `라이선스가 DB에 존재하지 않음: ${repoName} - ${licenseSpdxId}, NULL로 설정`
              );
              licenseInfo = null;
            }
          } else {
            console.log(`라이선스 정보가 없습니다: ${repoName}`);
          }
        } catch (licenseError) {
          console.error(
            `라이선스 정보 조회 중 오류: ${repoName}`,
            licenseError
          );
        }

        // 기본 분석 완료 상태 업데이트 (라이선스 정보만 포함)
        const updateData = {
          analysisStatus: 'completed',
          analysisProgress: 100,
          analysisCurrentStep: '분석 완료',
          analysisCompletedAt: new Date(),
          analysisErrorMessage: null,
        };

        // 라이선스 정보가 있으면 추가
        if (licenseInfo) {
          updateData.licenseSpdxId = licenseInfo;
        }

        const updateResult = await Repository.updateRepositoryAnalysisStatus(
          repoId,
          updateData
        );

        if (updateResult.success) {
          console.log(`분석 완료 상태 업데이트 성공: ${repoName}`);

          // 요청한 사용자의 트래킹 목록에 저장소 추가
          if (userId) {
            try {
              const trackingResult = await Repository.insertTrack(
                userId,
                repoId
              );
              if (trackingResult.success) {
                console.log(
                  `사용자 ${userId}의 트래킹 목록에 저장소 추가 완료: ${repoName}`
                );
              } else {
                console.error(
                  `사용자 ${userId}의 트래킹 목록 추가 실패: ${repoName}`,
                  trackingResult.error
                );
              }
            } catch (trackingError) {
              console.error(
                `사용자 ${userId}의 트래킹 목록 추가 중 오류: ${repoName}`,
                trackingError
              );
            }
          } else {
            console.log(
              `사용자 ID가 없어서 트래킹 목록 추가를 건너뜁니다: ${repoName}`
            );
          }

          try {
            await notificationController.pushNotification(userId, {
              type: 'analysis_complete',
              title: '분석 완료',
              status: 'completed',
              repo_name: repoName,
              message: `${repoName} 저장소 분석이 완료되었습니다.`,
              timestamp: Date.now(),
            });
            console.log(`분석 완료 알림 전송 성공: ${repoName}`);
          } catch (notificationError) {
            console.error(
              `분석 완료 알림 전송 실패: ${repoName}`,
              notificationError
            );
          }

          await notificationController
            .analysisCallback({
              repoName: repoName,
              result: true,
            })
            .catch((emailNotificationError) => {
              console.error(
                `분석 성공 - 이메일 알림 전송 실패: ${repoName}`,
                emailNotificationError
              );
            });

          return res.status(200).json({
            success: true,
            message: '분석이 성공적으로 완료되었습니다.',
            data: {
              repo_name: repoName,
              status: 'completed',
              repoId: repoId,
              licenseInfo: licenseInfo,
            },
          });
        } else {
          console.error(
            `분석 완료 상태 업데이트 실패: ${repoName}`,
            updateResult.error
          );
          return res.status(500).json({
            success: false,
            message: '분석 완료 상태 업데이트에 실패했습니다.',
            errorType: 'DATABASE_UPDATE_ERROR',
          });
        }
      } else if (status === 'failed') {
        console.log(`분석 실패 처리: ${repoName}, 오류: ${errorMessage}`);

        // 분석 실패 상태 업데이트
        const updateResult = await Repository.updateRepositoryAnalysisStatus(
          repoId,
          {
            analysisStatus: 'failed',
            analysisProgress: 0,
            analysisCurrentStep: '분석 실패',
            analysisErrorMessage:
              errorMessage || '알 수 없는 오류가 발생했습니다.',
          }
        );

        if (updateResult.success) {
          console.log(`분석 실패 상태 업데이트 성공: ${repoName}`);

          try {
            await notificationController.pushNotification(userId, {
              type: 'analysis_failed',
              title: '분석 실패',
              status: 'failed',
              repo_name: repoName,
              message: `${repoName} 저장소 분석이 실패했습니다.`,
              timestamp: Date.now(),
            });
            console.log(`분석 실패 알림 전송 성공: ${repoName}`);
          } catch (notificationError) {
            console.error(
              `분석 실패 알림 전송 실패: ${repoName}`,
              notificationError
            );
          }

          await notificationController
            .analysisCallback({
              repoName: repoName,
              result: false,
            })
            .catch((emailNotificationError) => {
              console.error(
                `분석 실패 - 이메일 알림 전송 실패: ${repoName}`,
                emailNotificationError
              );
            });

          return res.status(200).json({
            success: true,
            message: '분석 실패 상태가 업데이트되었습니다.',
            data: {
              repo_name: repoName,
              status: 'failed',
              errorMessage: errorMessage,
              repoId: repoId,
            },
          });
        } else {
          console.error(
            `분석 실패 상태 업데이트 실패: ${repoName}`,
            updateResult.error
          );
          return res.status(500).json({
            success: false,
            message: '분석 실패 상태 업데이트에 실패했습니다.',
            errorType: 'DATABASE_UPDATE_ERROR',
          });
        }
      } else {
        console.warn(`알 수 없는 분석 상태: ${repoName}, 상태: ${status}`);
        return res.status(400).json({
          success: false,
          message: `알 수 없는 분석 상태입니다: ${status}`,
          errorType: 'INVALID_STATUS',
        });
      }
    } catch (repoError) {
      console.error(`저장소 정보 조회 중 오류: ${repoName}`, repoError);

      // ValidationError 처리
      if (repoError instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: repoError.message,
          errorType: repoError.errorType,
        });
      }

      return res.status(500).json({
        success: false,
        message: '저장소 정보 조회 중 오류가 발생했습니다.',
        errorType: 'REPOSITORY_INFO_ERROR',
      });
    }
  } catch (error) {
    // 시스템 오류 알림 전송 - fire-and-forget 방식으로 처리
    notificationController
      .analysisCallback({ repoName: repoName, result: false })
      .catch((emailNotificationError) => {
        console.error(
          `시스템 오류 메일 전송 실패: ${{ repoName }}`,
          emailNotificationError
        );
      });

    notificationController
      .pushNotification(userId, {
        type: 'analysis_error',
        title: '시스템 오류',
        status: 'error',
        repo_name: repoName,
        message: '분석 처리 중 시스템 오류가 발생했습니다.',
        errorMessage: error?.message || '알 수 없는 오류',
        timestamp: Date.now(),
      })
      .catch((notificationError) => {
        console.error(
          `시스템 오류 알림 전송 실패: ${repoName}`,
          notificationError
        );
      });

    return res.status(500).json({
      success: false,
      message: `분석 완료 콜백 처리 중 오류가 발생했습니다. (${
        error?.message || '알 수 없는 오류'
      })`,
      errorType: 'INTERNAL_ERROR',
    });
  }
}

export default {
  handleAnalysisComplete,
};
