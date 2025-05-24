import { findRepository, getRepositories } from "../services/repositorySevices.js";
/// 요청 응답만 담당
// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
// - 1. 사용자가 검색하자마자 GITHUB API로 가져오기 -> 화면에 보여주기
// - 2. 비동기로 API로 가져온 데이터 DB 저장하기

async function searchRepository(req, res) {
  //사용자 계정 가져오기(JWT)
  const {query, page , per_page} = req.query;
  // 응답 추가하기
  if(!query) {
      return res.status(400).json({'error' : '저장소 검색에 실패했습니다.'}) //잘못된 요청
  } else{
      const repo = await findRepository(query);
      return res.status(200).json({'repositories' : repo })
  }
}
// 내 저장소 목록 조회
async function getRepositoryList(req, res) {
  const {userInfo = true, page, per_page} = req.query;
  
  if(!userInfo) {
    return res.status(401).json({'error': '권한이 없습니다.'})
  }else{
    if(!page && !per_page) {
      return res.status(400).json({'error' : '페이지 매개변수가 누락되었습니다.'}) // 잘못된 요청
    } else{
      const repos = await getRepositories()
      return res.status(200).json({'repositories' : repos});
    }
  }
}


//'내 저장소'에 특정 저장소 추가
function addRepositoriesInMyRepo (req, res) {
}
 
//'내 저장소'에서 특정 저장소 삭제
function deleteRepoInMyRepo (req, res) {}
//'특정 저장소 개요 정보 조회
function getOverviewRepo(req, res) {}
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIsuueList (req, res) {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvensation(req, res) {} 

export { searchRepository, getRepositoryList }//getRepoList, addRepoInMyRepo, deleteRepoInMyRepo, getOverviewRepo, getIsuueList, getCodeConvensation  };
