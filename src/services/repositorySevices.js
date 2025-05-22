import repoModel from "../models/repositoryModels.js";
// 비즈니스 로직 담당

// 내가 저장한 저장소 목록 중 특정 단어로 검색한 결과 가져오기
async function findRepository(word){
  const response = await repoModel.selectRepository(word); 
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
async function getRepositories() {
  const response = await repoModel.selectMyRepositories()
  return response;
}
//'내 저장소'에 특정 저장소 추가
function addRepoInMyRepo () {} 
//'내 저장소'에서 특정 저장소 삭제
function deleteRepoInMyRepo () {}
//'특정 저장소 개요 정보 조회
function getOverviewRepo() {}
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIsuueList () {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvensation() {} 


export {findRepository, getRepositories};
