const express = require("express");
const router = express.Router();
const {
  // function
} = require("../controllers/repositoryControllers");

// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
app.get("/repositories/search");

// 내 저장소 목록 조회
app.get("/repositories/tracked");

//'내 저장소'에 특정 저장소 추가
app.post("/repositories/tracked");

//'내 저장소'에서 특정 저장소 삭제
app.delete("/repositories/tracked/:github_repo_id");

//'특정 저장소 개요 정보 조회
app.get("/repositories/:github_repo_id/overview");

//특정 저장소 이슈 목록 및 AI 분석 결과 조회
app.get("/repositories/:github_repo_id/issues");

//특정 저장소 코드 컨벤션 문서 조회
app.get("/repositories/:github_repo_id/convention");

module.exports = router;
