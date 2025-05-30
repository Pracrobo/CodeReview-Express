import {
  searchRepositories,
  getUserRepositories,
  addRepositoryToTracking,
  checkUserTrackingStatus,
  removeRepositoryFromTracking,
} from '../services/repositoryService.js'; // 경로 수정

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
      message: '저장소 검색 중 오류가 발생했습니다.'
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
      message: '트래킹된 저장소 목록 조회 중 오류가 발생했습니다.'
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
    const isTracked = await checkUserTrackingStatus(userId, githubRepoId);

    if (isTracked.tracked) {
      return res.status(409).json({
        success: false,
        message: '이미 트래킹 중인 저장소입니다.'
      });
    }
  
    const repositories = await addRepositoryToTracking(userId, githubRepoId);

    return res.status(201).json({
      success: true,
      data: repositories.data,
      message: '저장소가 성공적으로 추가되었습니다.'
    });
  } catch (error) {
    console.error('저장소 추가 중 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '트래킹 저장소 추가 중 오류가 발생했습니다.'
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
      message: '삭제할 GitHub 저장소 ID가 필요합니다.'
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
      message: '트래킹 저장소 삭제 중 오류가 발생했습니다.'
    });
  }
}

export {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  deleteRepositoryInTracker,
};
