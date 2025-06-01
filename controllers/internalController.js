import Repository from '../models/Repository.js';
import { githubApiService } from '../services/githubApiService.js';
import { getConnectionPool } from '../database/database.js';

const pool = getConnectionPool();

// Flask에서 분석 완료 콜백 처리
async function handleAnalysisComplete(req, res) {
  try {
    const { repo_name, status, error_message } = req.body;

    if (!repo_name) {
      return res.status(400).json({
        success: false,
        message: '저장소 이름이 필요합니다.',
      });
    }

    console.log(`Flask에서 분석 완료 콜백 받음: ${repo_name}, 상태: ${status}`);

    // GitHub URL 구성
    const repoUrl = `https://github.com/${repo_name}`;

    try {
      // 저장소 정보 조회
      const repositoryInfo = await githubApiService.getRepositoryInfo(repoUrl);

      // 저장소 찾기
      const [rows] = await pool.query(
        'SELECT repo_id FROM repositories WHERE github_repo_id = ?',
        [repositoryInfo.githubRepoId]
      );

      if (rows.length === 0) {
        console.warn(`저장소를 찾을 수 없습니다: ${repo_name}`);
        return res.status(404).json({
          success: false,
          message: '저장소를 찾을 수 없습니다.',
        });
      }

      const repoId = rows[0].repo_id;

      // 분석 상태 업데이트
      const updateData = {
        analysisStatus: status === 'completed' ? 'completed' : 'failed',
        analysisProgress: status === 'completed' ? 100 : 0,
        analysisCurrentStep: status === 'completed' ? '분석 완료' : '분석 실패',
      };

      if (status === 'failed' && error_message) {
        updateData.analysisErrorMessage = error_message;
      }

      const updateResult = await Repository.updateRepositoryAnalysisStatus(
        repoId,
        updateData
      );

      if (updateResult.success) {
        console.log(
          `저장소 분석 상태 업데이트 완료: ${repo_name} -> ${status}`
        );

        return res.status(200).json({
          success: true,
          message: '분석 완료 처리됨',
        });
      } else {
        console.error(`저장소 분석 상태 업데이트 실패: ${repo_name}`);

        return res.status(500).json({
          success: false,
          message: '상태 업데이트 실패',
        });
      }
    } catch (githubError) {
      console.error(`GitHub API 오류: ${githubError.message}`);

      // GitHub API 실패 시 repo_name으로 직접 찾기 시도
      const [rows] = await pool.query(
        'SELECT repo_id FROM repositories WHERE full_name = ?',
        [repo_name]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '저장소를 찾을 수 없습니다.',
        });
      }

      const repoId = rows[0].repo_id;

      // 분석 상태 업데이트
      const updateData = {
        analysisStatus: status === 'completed' ? 'completed' : 'failed',
        analysisProgress: status === 'completed' ? 100 : 0,
        analysisCurrentStep: status === 'completed' ? '분석 완료' : '분석 실패',
      };

      if (status === 'failed' && error_message) {
        updateData.analysisErrorMessage = error_message;
      }

      const updateResult = await Repository.updateRepositoryAnalysisStatus(
        repoId,
        updateData
      );

      if (updateResult.success) {
        console.log(
          `저장소 분석 상태 업데이트 완료 (fallback): ${repo_name} -> ${status}`
        );

        return res.status(200).json({
          success: true,
          message: '분석 완료 처리됨',
        });
      } else {
        return res.status(500).json({
          success: false,
          message: '상태 업데이트 실패',
        });
      }
    }
  } catch (error) {
    console.error('분석 완료 콜백 처리 중 오류:', error);

    return res.status(500).json({
      success: false,
      message: '내부 서버 오류',
    });
  }
}

export { handleAnalysisComplete };
