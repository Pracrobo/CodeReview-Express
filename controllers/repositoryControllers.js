import { findRepository, getRepositories, addRepositoryToUserTrackedList, getUserTrackingStatusForRepo, deleteRepositoryToUserTrackedList} from "../services/repositoryServices.js";

// 저장소 검색, 단어로 fulltext
async function searchRepository(req, res) {
  //사용자 계정 가져오기
  //const { userInfo } = req.user;
  const userInfo = true;
  const {query, page , per_page} = req.query;
  // 응답 추가하기
  if(userInfo) {
    if(!query) {
        return res.status(400).json({error : '저장소 검색에 실패했습니다.'}) //잘못된 요청
    } else{
      const repo = await findRepository(query);
      if (repo.status &&  repo.data.length > 0) {
        return res.status(200).json({'repositories' : repo })
      }else if(repo.status){
        return res.status(200).json({data: [], message : '검색 결과가 없습니다.'})
      }else{
        console.log(repo.error);
        return res.status(500).json({message: repo.message})
      }
    }
  }else {
    return res.status(401).json({message: '로그인 해야 사용 가능'})
  }
}

// 내 저장소 목록 조회
async function getRepositoryList(req, res) {
  const userInfo = true; // 실제로는 req.user?.id;
  const userId = 1; 

  try {
    const repos = await getRepositories(userId);
    if (repos.length > 0) {
      return res.status(200).json({'repositories': repos });
    } else {
      return res.status(200).json({message : '저장한 레포지토리가 없습니다.'});
    }
  } catch (err) {
    console.error("getRepositories error:", err);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}


//'내 저장소'에 특정 저장소 추가
async function addRepositoryInTracker(req, res) {
  const userInfo = true; // 실제 배포 시 req.user 사용
  const userId = 1;
  const githubRepoId = req.query.githubRepoId;

  
  if (!githubRepoId) {
    return res.status(400).json({ error: '추가할 GitHub 저장소가 없습니다.' });
  }

  try {
    // 1. 트래킹 여부 확인
    const isTracking = await getUserTrackingStatusForRepo(userId, githubRepoId);
    if (isTracking.status) {
      return res.status(409).json({ message: '이미 트래킹 중인 저장소입니다.' });
    }
    // 2. 트래킹 추가
    const result = await addRepositoryToUserTrackedList(userId, githubRepoId);
    if (result) {
      console.log("githubRepoId :", githubRepoId, "저장소에 추가 완료");
      return res.status(201).json({
        repositories: result,
        message: 'Repository added successfully.'
      });
    }
  } catch (error) {
    if (error.message.includes('SELECT_FAILED')) {
      console.error("DB insertError of addRepositoriesInTrackerFunction controller:", error);
      return res.status(500).json({
        error: '서버 처리 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'
      })
    } else if (error.message.includes('INSERT_FAILED')) {
      return res.status(404).json({ error: '요청하신 GitHub 저장소를 찾을 수 없습니다.' });
    }
  }
}  
 
//'내 저장소'에서 특정 저장소 삭제
async function deleteRepositoryInTracker (req, res) {
  const userInfo = true; // 실제 배포 시 req.user 사용
  const userId = 1;
  const githubRepoId = req.query.github_repo_id;
  
  if (!githubRepoId) {
    return res.status(400).json({ error: '추가할 GitHub 저장소가 없습니다.' });
  }
  try {
    const isdeleted = await deleteRepositoryToUserTrackedList(userId, githubRepoId);
    if(isdeleted.affectedRows > 0) {
      return res.status(204).json({message : "삭제 완료"})
    }else{
      return res.status(403).json({message : "이미 삭제됨"});
    }
  } catch (error) {
    if (error.message?.includes('DELETE_FAILED')) {
      return res.status(500).json({
        error: '서버 처리 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'
      });
    }
  }
}
// TODO: 특정 저장소 개요 정보 조회
/*
async function getOverviewRepo(req, res) {
  const userInfo = true; // 실제 배포 시 req.user 사용
  const userId = 1;  
  const githubRepoId = req.query.github_repo_id;

 // const result = await getOverViewRepository(githubRepoId);

}
 */
//특정 저장소 이슈 목록 및 AI 분석 결과 조회
function getIssueList (req, res) {}
//특정 저장소 코드 컨벤션 문서 조회
function getCodeConvention(req, res) {} 

export { searchRepository, getRepositoryList, addRepositoryInTracker, deleteRepositoryInTracker}
