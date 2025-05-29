import repoModel from '../models/Repository.js';


async function searchRepositories(word) {
  try {
    const response = await repoModel.selectRepository(word);
    return {
      success: response.status,
      data: response.data || [],
      message: response.status ? null : '검색 중 오류가 발생했습니다.',
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      message: '서버 오류로 검색에 실패했습니다.' + error.message,
    };
  }
}

async function getUserRepositories(userId) {
  const response = await repoModel.selectTrackRepositories(userId);
  return response;  
};

async function checkUserTrackingStatus(userId, githubRepositoryId) {
  const response = await repoModel.selectTrack(userId, githubRepositoryId);
  if (!response.status) {
    throw new Error('트래킹 상태 확인에 실패했습니다.');
  }
  return response.tracked;
}

async function addRepositoryToTracking(userId, githubRepositoryId) {
  const insertResponse = await repoModel.insertTrack(
    userId,
    githubRepositoryId
  );
  if (!insertResponse.status) {
    throw new Error('저장소 추가에 실패했습니다.');
  }
  return await getUserRepositories(userId);
}

async function removeRepositoryFromTracking(userId, githubRepoId) {
  const deleteResponse = await repoModel.deleteTrack(userId, githubRepoId);
  if (!deleteResponse.status) {
    throw new Error('저장소 삭제에 실패했습니다.');
  }
  return deleteResponse;
}

export {
  searchRepositories,
  getUserRepositories,
  checkUserTrackingStatus,
  addRepositoryToTracking,
  removeRepositoryFromTracking,
};
