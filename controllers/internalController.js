import Repository from '../models/Repository.js';
import { githubApiService } from '../services/githubApiService.js';
import { flaskService } from '../services/flaskService.js';
import { getConnectionPool } from '../database/database.js';

// 새로 추가: 검증 유틸리티
import { ValidationError, validateLanguagesData } from '../utils/validators.js';

const pool = getConnectionPool();

// Flask에서 분석 완료 콜백 처리
async function handleAnalysisComplete(req, res) {
  try {
    const { repo_name, status, error_message } = req.body;

    // 기본 검증
    if (!repo_name) {
      return res.status(400).json({
        success: false,
        message: '저장소 이름이 필요합니다.',
        errorType: 'MISSING_REPO_NAME',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '분석 상태가 필요합니다.',
        errorType: 'MISSING_STATUS',
      });
    }

    console.log(`Flask에서 분석 완료 콜백 받음: ${repo_name}, 상태: ${status}`);

    // GitHub URL 구성
    const repoUrl = `https://github.com/${repo_name}`;

    try {
      // 저장소 정보 조회
      const repositoryInfo = await githubApiService.getRepositoryInfo(repoUrl);

      if (!repositoryInfo) {
        console.error(`저장소 정보를 찾을 수 없습니다: ${repo_name}`);
        return res.status(404).json({
          success: false,
          message: '저장소 정보를 찾을 수 없습니다.',
          errorType: 'REPOSITORY_NOT_FOUND',
        });
      }

      // DB에서 저장소 조회
      const repoResult = await Repository.selectRepositoryByGithubId(
        repositoryInfo.githubRepoId
      );

      if (!repoResult.success || !repoResult.data) {
        console.error(`DB에서 저장소를 찾을 수 없습니다: ${repo_name}`);
        return res.status(404).json({
          success: false,
          message: 'DB에서 저장소를 찾을 수 없습니다.',
          errorType: 'REPOSITORY_NOT_FOUND_IN_DB',
        });
      }

      const repoId = repoResult.data.id;

      if (status === 'completed') {
        console.log(`분석 완료 처리 시작: ${repo_name}`);

        try {
          // 언어 정보 조회 및 검증
          const languagesData = await githubApiService.getRepositoryLanguages(
            repoUrl
          );
          validateLanguagesData(languagesData, repoUrl);

          // 언어 정보를 DB에 저장
          if (languagesData && Object.keys(languagesData).length > 0) {
            console.log(`언어 정보 저장 중: ${repo_name}`, languagesData);

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
              console.log(`언어 정보 저장 완료: ${repo_name}`);
            } else {
              console.error(
                `언어 정보 저장 실패: ${repo_name}`,
                languageResult.error
              );
            }
          } else {
            console.log(`언어 정보가 없습니다: ${repo_name}`);
          }
        } catch (languageError) {
          console.error(`언어 정보 처리 중 오류: ${repo_name}`, languageError);
          // 언어 정보 처리 실패는 전체 분석 완료를 막지 않음
        }

        // README 요약 및 라이선스 정보 처리
        let readmeSummary = null;
        let licenseInfo = null;

        try {
          console.log(`README 및 라이선스 정보 조회 시작: ${repo_name}`);

          // README 내용 조회
          const readmeData = await githubApiService.getRepositoryReadme(
            repoUrl
          );
          if (readmeData && readmeData.content) {
            console.log(
              `README 조회 완료: ${repo_name}, 크기: ${readmeData.size} bytes`
            );

            // Flask에 README 요약 요청
            const summaryResult = await flaskService.requestReadmeSummary(
              repo_name,
              readmeData.content
            );

            if (summaryResult.success && summaryResult.data) {
              readmeSummary = summaryResult.data.summary;
              console.log(`README 요약 완료: ${repo_name}`);
            } else {
              console.warn(
                `README 요약 실패: ${repo_name} - ${summaryResult.error}`
              );
              // 기본 설명 사용 (GitHub description 또는 저장소 이름 기반)
              readmeSummary =
                repositoryInfo.description || `${repo_name} 저장소입니다.`;
            }
          } else {
            console.log(`README 파일이 없습니다: ${repo_name}`);
            readmeSummary =
              repositoryInfo.description || `${repo_name} 저장소입니다.`;
          }

          // 라이선스 정보 조회
          const licenseData = await githubApiService.getRepositoryLicense(
            repoUrl
          );
          if (licenseData && licenseData.license) {
            licenseInfo = licenseData.license.spdxId;
            console.log(
              `라이선스 정보 조회 완료: ${repo_name} - ${licenseInfo}`
            );
          } else {
            console.log(`라이선스 정보가 없습니다: ${repo_name}`);
          }
        } catch (readmeError) {
          console.error(
            `README/라이선스 처리 중 오류: ${repo_name}`,
            readmeError
          );
          // README/라이선스 처리 실패는 전체 분석 완료를 막지 않음
          readmeSummary =
            repositoryInfo.description || `${repo_name} 저장소입니다.`;
        }

        // 분석 완료 상태 업데이트 (README 요약 및 라이선스 정보 포함)
        const updateData = {
          analysisStatus: 'completed',
          analysisProgress: 100,
          analysisCurrentStep: '분석 완료',
          analysisCompletedAt: new Date(),
          analysisErrorMessage: null,
        };

        // README 요약이 있으면 추가
        if (readmeSummary) {
          updateData.readmeSummaryGpt = readmeSummary;
        }

        // 라이선스 정보가 있으면 추가
        if (licenseInfo) {
          updateData.licenseSpdxId = licenseInfo;
        }

        const updateResult = await Repository.updateRepositoryAnalysisStatus(
          repoId,
          updateData
        );

        if (updateResult.success) {
          console.log(`분석 완료 상태 업데이트 성공: ${repo_name}`);
          return res.status(200).json({
            success: true,
            message: '분석이 성공적으로 완료되었습니다.',
            data: {
              repoName: repo_name,
              status: 'completed',
              repoId: repoId,
              readmeSummary: readmeSummary,
              licenseInfo: licenseInfo,
            },
          });
        } else {
          console.error(
            `분석 완료 상태 업데이트 실패: ${repo_name}`,
            updateResult.error
          );
          return res.status(500).json({
            success: false,
            message: '분석 완료 상태 업데이트에 실패했습니다.',
            errorType: 'DATABASE_UPDATE_ERROR',
          });
        }
      } else if (status === 'failed') {
        console.log(`분석 실패 처리: ${repo_name}, 오류: ${error_message}`);

        // 분석 실패 상태 업데이트
        const updateResult = await Repository.updateRepositoryAnalysisStatus(
          repoId,
          {
            analysisStatus: 'failed',
            analysisProgress: 0,
            analysisCurrentStep: '분석 실패',
            analysisErrorMessage:
              error_message || '알 수 없는 오류가 발생했습니다.',
          }
        );

        if (updateResult.success) {
          console.log(`분석 실패 상태 업데이트 성공: ${repo_name}`);
          return res.status(200).json({
            success: true,
            message: '분석 실패 상태가 업데이트되었습니다.',
            data: {
              repoName: repo_name,
              status: 'failed',
              errorMessage: error_message,
              repoId: repoId,
            },
          });
        } else {
          console.error(
            `분석 실패 상태 업데이트 실패: ${repo_name}`,
            updateResult.error
          );
          return res.status(500).json({
            success: false,
            message: '분석 실패 상태 업데이트에 실패했습니다.',
            errorType: 'DATABASE_UPDATE_ERROR',
          });
        }
      } else {
        console.warn(`알 수 없는 분석 상태: ${repo_name}, 상태: ${status}`);
        return res.status(400).json({
          success: false,
          message: `알 수 없는 분석 상태입니다: ${status}`,
          errorType: 'INVALID_STATUS',
        });
      }
    } catch (repoError) {
      console.error(`저장소 정보 조회 중 오류: ${repo_name}`, repoError);

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
    console.error('분석 완료 콜백 처리 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '분석 완료 콜백 처리 중 오류가 발생했습니다.',
      errorType: 'INTERNAL_ERROR',
    });
  }
}

export { handleAnalysisComplete };
