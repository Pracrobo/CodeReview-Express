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
      message: '서버 오류로 검색에 실패했습니다.',
    };
  }
}

async function getUserRepositories(userId) {
  const response = await repoModel.selectTrackRepositories(userId);
  if (!response.status) {
    throw new Error('저장소 목록 조회에 실패했습니다.');
  }

  return response.data.map((row) => ({
    repoId: row.repo_id,
    githubRepoId: row.github_repo_id,
    fullName: row.full_name,
    description: row.description,
    htmlUrl: row.html_url,
    isTrackedByCurrentUser: true,
    programmingLanguage: row.programming_language,
    languagePercentage: row.language_percentage,
    licenseSpdxId: row.license_spdx_id,
    readmeSummaryGpt: row.readme_summary_gpt,
    star: row.star,
    fork: row.fork,
    prTotalCount: row.pr_total_count,
    issueTotalCount: row.issue_total_count,
    lastAnalyzedAt: row.last_analyzed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

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
