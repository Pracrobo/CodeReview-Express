import express from 'express';
import {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  deleteRepositoryInTracker,
} from '../controllers/repositoryController.js';
import requireAuth from '../middlewares/authMiddleware.js'; // 인증 미들웨어

const router = express.Router();

// GitHub 저장소 검색 (공개 및 사용자 권한 저장소)
router.get('/search', requireAuth, searchRepository);

// 내 저장소 목록 조회
router.get('/tracked', requireAuth, getRepositoryList);

//'내 저장소'에 특정 저장소 추가
router.post('/tracked', requireAuth, addRepositoryInTracker);

//'내 저장소'에서 특정 저장소 삭제
router.delete('/tracked', requireAuth, deleteRepositoryInTracker);

export default router;
