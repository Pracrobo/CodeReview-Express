import repoModel from "../models/repositoryModels.js";
// 비즈니스 로직 담당

// 내가 저장한 저장소 목록 중 특정 단어로 검색한 결과 가져오기
async function findRepository(word){
  const response = await repoModel.selectRepository(word); 
  return response;
}
async function addRepository(githubRepositoryInfo) {
  const response = await repoModel.insertRepository(githubRepositoryInfo)
  return response;
}
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
// 내 저장소 목록 조회
async function getRepositories(userId) {
  const response = await repoModel.selectMyRepositories(userId)
  return response;
}

// 1. 사용자 트래킹 목록에 저장소 id 있는지 확인
async function getUserTrackingStatusForRepo(userId, githubRepositoryId) {
  const response = await repoModel.selectTrack(userId, githubRepositoryId);
  if(response) {
    console.log('트래킹 목록에 있음');
    return true;
  }else {
    console.log('트래킹 목록에 없음');
    return false;
  }
}
//'내 저장소'에 특정 저장소 추가(트래킹 목록에 추가)
async function addRepositoryToUserTrackedList (userId, githubRepositoryId) {
  const response = await repoModel.insertTrack(userId, githubRepositoryId);
  if(response) {
    console.log(`${response} tracking db에 insert성공`);
    return true;
  }else{
    console.log(`tracking db에 insert실패`);
    return false;
  }
} 
//'내 저장소'에서 특정 저장소 삭제
function deleteRepoInMyRepo () {}
//'특정 저장소 개요 정보 조회
function getOverviewRepo() {}
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIsuueList () {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvensation() {} 


export {findRepository, getRepositories, getUserTrackingStatusForRepo, addRepository, addRepositoryToUserTrackedList};
