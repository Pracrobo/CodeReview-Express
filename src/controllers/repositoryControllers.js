import { findRepository, getRepositories, addRepositoryToUserTrackedList, getUserTrackingStatusForRepo } from "../services/repositoryServices.js";


async function searchRepository(req, res) {
  //사용자 계정 가져오기(JWT)
  //const { userInfo } = req.user;
  const {query, page , per_page} = req.query;
  // 응답 추가하기
  if(userInfo) {
    if(!query) {
        return res.status(400).json({'error' : '저장소 검색에 실패했습니다.'}) //잘못된 요청
    } else{
        const repo = await findRepository(query);
        return res.status(200).json({'repositories' : repo })
    }
  }else {
    return res.status(401).json({'message': '로그인 해야 사용 가능'})
  }
}
// 내 저장소 목록 조회
async function getRepositoryList(req, res) {
  //const userInfo = req.user;
  const userInfo = true;
  const userId = 1;
  const {page, per_page} = req.query;
  
  if(!userInfo) {
    return res.status(401).json({'message': '권한이 없습니다.'})
  }else{
    if(!page && !per_page) {
      return res.status(400).json({'error' : '잘못된 요청'})
    } else{
      const repos = await getRepositories(userId)
      return res.status(200).json({'repositories' : repos});
    }
  }
}


//'내 저장소'에 특정 저장소 추가
async function addRepositoriesInMyRepo (req, res) {
  // 1. JWT 미들웨어(예: verifyJWT)가 req.user에 담아준 사용자 정보를 사용합니다.
  // const userInfo = req.user;
  const userInfo = true;
  const userId = 1;
  const { githubRepoId } = req.query; 
  try {
    // 2. 사용자 인증 정보가 유효한지 다시 한 번 확인합니다. (미들웨어 후처리)
    //    userInfo 객체와 그 안에 사용자 ID가 있는지 확인하여 안정성을 높입니다.
    if (!userInfo) {
      console.warn("User information missing for repository addition attempt.");
      return res.status(401).json({ 'message': '인증된 사용자 정보가 필요합니다.' });
    }
    if (!githubRepoId) {
      return res.status(400).json({ 'error': '추가할 GitHub 저장소 ID가 요청에 포함되지 않았습니다.' });
    }
    // 3. 서비스 레이어의 함수를 호출하여, 해당 저장소가 이미 사용자의 트래킹 목록에 있는지 확인.(userId추가 예정)
    const isTracking = await repositoryService.getUserTrackingStatusForRepo(userId, githubRepoId);
    if (isTracking) {
      return res.status(409).json({ 'message': '이미 트래킹 중인 저장소입니다.' });
    }
    // 4.GitHub 저장소를 사용자 목록에 추가합니다.
    const result = await repositoryService.addRepositoryToUserTrackedList(userId, githubRepoId);
    if(result) {
      return res.status(201).json({
        'repoId': result.repositoryId, 
        'githubRepoId': result.githubRepoId, 
        'fullName': result.repositoryName, 
        'message': 'Repository added successfully.'
      });
    }else{
      return res.status(401).json({'message' : '트래킹 목록에 저장 실패'})
    }
  } catch (error) {
    console.error("Error in addRepositoriesInMyRepo controller:", error);
    if (error.message.includes('GitHub 저장소를 찾을 수 없음')) {
      return res.status(404).json({ 'error': '요청하신 GitHub 저장소를 찾을 수 없습니다.' });
    }
    return res.status(500).json({ 'error': '서버 처리 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.' });
  }
}
 
//'내 저장소'에서 특정 저장소 삭제
function deleteRepoInMyRepo (req, res) {}
//'특정 저장소 개요 정보 조회
function getOverviewRepo(req, res) {}
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIssueList (req, res) {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvention(req, res) {} 

export { searchRepository, getRepositoryList, addRepositoriesInMyRepo }//getRepoList, addRepoInMyRepo, deleteRepoInMyRepo, getOverviewRepo, getIsuueList, getCodeConvensation  };
