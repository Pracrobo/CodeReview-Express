import repoModel from '../models/Repository.js';


async function searchRepositories(word) {
  const response = await repoModel.selectRepository(word);
  if(!response.status) {
    throw new Error('저장소 검색에 실패했습니다.' + response.error);
  }
  return response.data || [];
};

async function getUserRepositories(userId) {
  const response = await repoModel.selectTrackRepositories(userId);
  if (!response.status) {
    throw new Error('유저별 저장소 찾기에 실패했습니다.' + response.error);
  }
  return response.data || [];
};

async function checkUserTrackingStatus(userId, githubRepositoryId) {
  const response = await repoModel.selectTrack(userId, githubRepositoryId);
  if (!response.status) {
    throw new Error('트래킹 상태 확인에 실패했습니다.' + response.error);
  }
  return response.tracked;
};

async function addRepositoryToTracking(userId, githubRepositoryId) {
  const response = await repoModel.insertTrack(userId, githubRepositoryId);
  if (!response.status) {
    throw new Error('저장소 추가에 실패했습니다.' + response.error);
  }
  return await getUserRepositories(userId);
};

async function removeRepositoryFromTracking(userId, githubRepoId) {
  const response = await repoModel.deleteTrack(userId, githubRepoId);
  if (!response.status) {
    throw new Error('저장소 삭제에 실패했습니다.' + response.error);
  }
  return response.data;
};

export default {
  searchRepositories,
  getUserRepositories,
  checkUserTrackingStatus,
  addRepositoryToTracking,
  removeRepositoryFromTracking,
};
