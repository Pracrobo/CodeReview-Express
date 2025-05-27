import express from 'express';
import {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  deleteRepositoryInTracker,
} from '../controllers/repositoryController.js';
import requireAuth from '../middlewares/requireAuth.js'; // 인증 미들웨어

const router = express.Router();

// GitHub 저장소 검색 (공개 및 사용자 권한 저장소) - 인증 필요
router.get('/search', requireAuth, searchRepository);

// 내 저장소 목록 조회 - 인증 필요
router.get('/tracked', requireAuth, getRepositoryList);

//'내 저장소'에 특정 저장소 추가 - 인증 필요
router.post('/tracked', requireAuth, addRepositoryInTracker);

//'내 저장소'에서 특정 저장소 삭제 - 인증 필요
router.delete('/tracked', requireAuth, deleteRepositoryInTracker);

// TODO:
//'특정 저장소 개요 정보 조회
// router.get("/overview", getOverviewRepo);

// //특정 저장소 이슈 목록 및 AI 분석 결과 조회
// router.get("/issues", getIssueList); // app.get 대신 router.get 사용해야 함

// //특정 저장소 코드 컨벤션 문서 조회
// router.get("/convention", getCodeConvention); // app.get 대신 router.get 사용해야 함

export default router;
