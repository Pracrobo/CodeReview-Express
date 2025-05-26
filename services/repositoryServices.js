import repoModel from "../models/repositoryModels.js";
// 비즈니스 로직 담당

// 내가 저장한 저장소 목록 중 특정 단어로 검색한 결과 가져오기
async function findRepository(word){
  const response = await repoModel.selectRepository(word); 
  return response;
}
// 내 저장소 목록 조회
async function getRepositories(userId) {
  const response = await repoModel.selectTrackRepositories(userId);
  if (!response.status) {
    throw response.error;
  }
  return response;
}

// async function addRepository(githubRepositoryInfo) {
//  const response = await repoModel.insertRepository(githubRepositoryInfo)
//  return response;
//}

// 1. 사용자 트래킹 목록에 저장소 id 있는지 확인
async function getUserTrackingStatusForRepo(userId, githubRepositoryId) {
  const result = await repoModel.selectTrack(userId, githubRepositoryId);
  if (!result.status) {
    console.log("DB 조회 실패");
    throw new Error('DB 조회 실패');
  } else if (result.tracked) {
    console.log("트래킹 중인 레포 있음:", result.data);
    return true;
  } else {
    console.log("트래킹 안 된 레포");
    return false;
  }
}
//'내 저장소'에 특정 저장소 추가(트래킹 목록에 추가)
async function addRepositoryToUserTrackedList(userId, githubRepositoryId) {
  const insertResponse = await repoModel.insertTrack(userId, githubRepositoryId);
  if (insertResponse.error) {
    throw new Error('INSERT_FAILED');
  }
  return getRepositories(userId)
}


//'내 저장소'에서 특정 저장소 삭제
async function deleteRepositoryToUserTrakedList (userId, githubRepoId) {
  const deleteResponse = await repoModel.deleteTrack(userId, githubRepoId);
  if(deleteResponse.error) {
    throw new Error('DELETE_FAILED');
  }
  return deleteResponse;
}
//'특정 저장소 개요 정보 조회
function getOverviewRepo() {}
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIsuueList () {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvention() {} 
//function pagination()

// }
// const pageProcess = async(page, perPage) => {
//   const currentPage = 1;
//   const totalPage = 1;
//   const totalItems = 5;
//   const hasNextPage = false;
//   const hasPrePage = false;

//   const pageInfo = {page, perPage, currentPage, totalPage, totalItems, hasNextPage, hasPrePage}
//   return pageInfo
// }

export {findRepository, getRepositories,  getUserTrackingStatusForRepo,  addRepositoryToUserTrackedList, deleteRepositoryToUserTrakedList};