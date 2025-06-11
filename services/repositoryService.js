import RepositoryModel from '../models/Repository.js';

// 저장소 검색
async function searchRepositories(word) {
  const response = await RepositoryModel.selectRepository(word);
  if (!response.success) {
    throw new Error('저장소 검색에 실패했습니다.');
  }
  return response;
}

// 유저별 저장소 목록 조회
async function getUserRepositories(userId) {
  const response = await RepositoryModel.selectTrackRepositories(userId);
  if (!response.success) {
    throw new Error('유저별 저장소 찾기에 실패했습니다.');
  }
  return response;
}

// 유저가 특정 저장소를 트래킹 중인지 확인
async function checkUserTrackingStatus(userId, githubRepositoryId) {
  const response = await RepositoryModel.selectTrack(
    userId,
    githubRepositoryId
  );
  if (!response.success) {
    throw new Error('트래킹 상태 확인에 실패했습니다.');
  }
  return response;
}

// 저장소 트래킹 추가
async function addRepositoryToTracking(userId, githubRepositoryId) {
  const response = await RepositoryModel.insertTrack(
    userId,
    githubRepositoryId
  );
  if (!response.success) {
    throw new Error('저장소 추가에 실패했습니다.');
  }
  return await getUserRepositories(userId);
}

// 저장소 트래킹 삭제
async function removeRepositoryFromTracking(userId, githubRepoId) {
  const response = await RepositoryModel.deleteTrack(userId, githubRepoId);
  if (!response.success) {
    throw new Error('저장소 삭제에 실패했습니다.');
  }
  return response;
}

export default {
  searchRepositories,
  getUserRepositories,
  checkUserTrackingStatus,
  addRepositoryToTracking,
  removeRepositoryFromTracking,
};
