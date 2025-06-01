import express from 'express';
import {
  searchRepository,
  getRepositoryList,
  addRepositoryInTracker,
  deleteRepositoryInTracker,
  analyzeRepository,
  getAnalyzingRepositories,
  getRecentlyAnalyzedRepositories,
  getAnalysisStatus,
  updateRepositoryLastViewed,
  getRepositoryDetails,
  getRepositoryLanguages,
} from '../controllers/repositoryController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 내 저장소의 저장소중 검색
router.get('/search', authenticate, searchRepository);

// 내 저장소 목록 조회
router.get('/tracked', authenticate, getRepositoryList);

// 저장소 트래킹 추가
router.post('/tracked', authenticate, addRepositoryInTracker);

// 저장소 트래킹 삭제
router.delete(
  '/tracked/:githubRepoId',
  authenticate,
  deleteRepositoryInTracker
);

// ===== 새로 추가: 저장소 분석 관련 라우트 =====

// 저장소 분석 시작
router.post('/analyze', authenticate, analyzeRepository);

// 분석 중인 저장소 목록 조회
router.get('/analyzing', authenticate, getAnalyzingRepositories);

// 최근 분석 완료된 저장소 목록 조회
router.get('/recently-analyzed', authenticate, getRecentlyAnalyzedRepositories);

// 저장소 상세 정보 조회
router.get('/:repoId/details', authenticate, getRepositoryDetails);

// 특정 저장소의 분석 상태 조회
router.get('/:repositoryId/status', authenticate, getAnalysisStatus);

// 저장소 조회 시 마지막 조회 시간 업데이트
router.patch('/:repoId/viewed', authenticate, updateRepositoryLastViewed);

// 저장소 언어 정보 조회
router.get('/:repoId/languages', authenticate, getRepositoryLanguages);

export default router;
