const express = require("express");
const router = express.Router();
const {
  // function
} = require("../controllers/issueControllers");

//특정 이슈 상세 분석 정보 및 원본 내용 조회
app.get("/repositories/:github_repo_id/issues/:github_issue_number");

//특정 이슈를 '해결 목록'에 수동 추가
app.post("/users/me/solved-issues");

module.exports = router;
