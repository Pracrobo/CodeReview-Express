import express from "express";
import { searchRepository, getRepositoryList, addRepositoriesInMyRepo } from "../controllers/repositoryControllers.js";
const router = express.Router();
// const {
//   searchRepo// getRepoList, addRepoInMyRepo, deleteRepoInMyRepo, getOverviewRepo, getIsuueList, getCodeConvensation 
// } = require("../controllers/repositoryControllers");

// 내 저장소 목록 조회
router.get("/tracked", getRepositoryList);
// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
router.get("/search", searchRepository);

//'내 저장소'에 특정 저장소 추가
router.post("/tracked/:github_repo_id", addRepositoriesInMyRepo);
 
// //'내 저장소'에서 특정 저장소 삭제
// app.delete("/repositories/tracked/:github_repo_id", deleteRepoInMyRepo);

// //'특정 저장소 개요 정보 조회
// app.get("/repositories/:github_repo_id/overview", getOverviewRepo);

// //특정 저장소 이슈 목록 및 AI 분석 결과 조회
// app.get("/repositories/:github_repo_id/issues", getIsuueList);

// //특정 저장소 코드 컨벤션 문서 조회
// app.get("/repositories/:github_repo_id/convention", getCodeConvensation);

export default router;
