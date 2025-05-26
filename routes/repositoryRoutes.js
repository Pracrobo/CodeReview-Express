import express from "express";
import { searchRepository, getRepositoryList, addRepositoryInTracker, deleteRepositoryInTracker} from "../controllers/repositoryControllers.js";
// import validatePagination from "../middlewares/vaildateQuery.js"
//import requireAuth from "../middlewares/requireAuth.js"
const router = express.Router();

// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
router.get("/search", searchRepository);

// 내 저장소 목록 조회 ,// requireAuth, validatePagination,
router.get("/tracked", getRepositoryList);

//'내 저장소'에 특정 저장소 추가
router.post("/tracked", addRepositoryInTracker);
 
//'내 저장소'에서 특정 저장소 삭제
router.delete("/tracked", deleteRepositoryInTracker);

// TODO:
//'특정 저장소 개요 정보 조회
// router.get("/overview", getOverviewRepo);

// //특정 저장소 이슈 목록 및 AI 분석 결과 조회
// app.get("/repositories/:github_repo_id/issues", getIsuueList);

// //특정 저장소 코드 컨벤션 문서 조회
// app.get("/repositories/:github_repo_id/convention", getCodeConvensation);

export default router;
