import repoModel from '../models/repositoryModel.js';
// 비즈니스 로직 담당

// 내가 저장한 저장소 목록 중 특정 단어로 검색한 결과 가져오기
async function findRepository(word) {
  try {
    const response = await repoModel.selectRepository(word);
    if (response.status) {
      const data = response.data.map((row) => ({
        userId: row.user_id,
        repoId: row.repo_id,
        githubRepoId: row.github_repo_id,
        fullName: row.full_name,
        description: row.description,
        htmlUrl: row.html_url,
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
      return { status: true, data: data };
    } else {
      return { status: true, data: [] };
    }
  } catch (err) {
    return {
      status: false,
      message: '서버 오류로 검색에 실패했습니다.',
      error: err,
    };
  }
}

// 내 저장소 목록 조회
async function getRepositories(userId) {
  const response = await repoModel.selectTrackRepositories(userId);
  if (!response.status) {
    throw new Error('SELECT_FAILED');
  }
  const data = response.data.map((row) => ({
    userId: userId,
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
  return data;
}

// 1. 사용자 트래킹 목록에 저장소 id 있는지 확인
async function getUserTrackingStatusForRepo(userId, githubRepositoryId) {
  const results = await repoModel.selectTrack(userId, githubRepositoryId);
  if (!results.status) {
    throw new Error('SELECT_FAILED');
  } else if (results.tracked) {
    return { status: true };
  } else {
    return { status: false };
  }
}
//'내 저장소'에 특정 저장소 추가(트래킹 목록에 추가)
async function addRepositoryToUserTrackedList(userId, githubRepositoryId) {
  const insertResponse = await repoModel.insertTrack(
    userId,
    githubRepositoryId
  );
  if (insertResponse.error) {
    throw new Error('INSERT_FAILED');
  } else {
    return await getRepositories(userId);
  }
}

//'내 저장소'에서 특정 저장소 삭제
async function deleteRepositoryToUserTrackedList(userId, githubRepoId) {
  const deleteResponse = await repoModel.deleteTrack(userId, githubRepoId);
  if (deleteResponse.error) {
    throw new Error('DELETE_FAILED');
  }
  return deleteResponse;
}
// TODO: 특정 저장소 개요 정보 조회
/*
async function getOverViewRepository(userId, githubRepoId) {
  const response = await repoModel.selectOverviewRepoAndIssue(userId, githubRepoId);
  if(response.error) {
    throw new Error('');
  }
  return response;
}
  */
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIssueList() {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvention() {}
//function pagination()

//  TODO:
// const pageProcess = async(page, perPage) => {
//   const currentPage = 1;
//   const totalPage = 1;
//   const totalItems = 5;
//   const hasNextPage = false;
//   const hasPrePage = false;

//   const pageInfo = {page, perPage, currentPage, totalPage, totalItems, hasNextPage, hasPrePage}
//   return pageInfo
// }

export {
  findRepository,
  getRepositories,
  getUserTrackingStatusForRepo,
  addRepositoryToUserTrackedList,
  deleteRepositoryToUserTrackedList,
};
