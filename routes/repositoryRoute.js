import express from 'express';
import repositoryController from '../controllers/repositoryController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 내 저장소의 저장소중 검색
router.get('/search', authenticate, repositoryController.searchRepository);

// 내 저장소 목록 조회
router.get('/tracked', authenticate, repositoryController.getRepositoryList);

// 저장소 트래킹 추가
router.post(
  '/tracked',
  authenticate,
  repositoryController.addRepositoryInTracker
);

// 저장소 분석 시작
router.post('/analyze', authenticate, repositoryController.analyzeRepository);

// 분석 중인 저장소 목록 조회
router.get(
  '/analyzing',
  authenticate,
  repositoryController.getAnalyzingRepositories
);

// 최근 분석 완료된 저장소 목록 조회
router.get(
  '/recently-analyzed',
  authenticate,
  repositoryController.getRecentlyAnalyzedRepositories
);

// 저장소 상세 정보 조회
router.get(
  '/:repoId/details',
  authenticate,
  repositoryController.getRepositoryDetails
);

// 특정 저장소의 분석 상태 조회
router.get(
  '/:repositoryId/status',
  authenticate,
  repositoryController.getAnalysisStatus
);

// 저장소 조회 시 마지막 조회 시간 업데이트
router.patch(
  '/:repoId/viewed',
  authenticate,
  repositoryController.updateRepositoryLastViewed
);

// 저장소 언어 정보 조회
router.get(
  '/:repoId/languages',
  authenticate,
  repositoryController.getRepositoryLanguages
);

// 즐겨찾기 상태 업데이트
router.patch(
  '/:repoId/favorite',
  authenticate,
  repositoryController.updateFavoriteStatus
);

// 저장소별 이슈 목록 조회 (state 파라미터로 open/closed 필터 가능)
router.get(
  '/:repoId/issues',
  authenticate,
  repositoryController.getRepositoryIssues
);

// 저장소별 이슈 상세 조회
router.get(
  '/:repoId/issues/:githubIssueNumber',
  authenticate,
  repositoryController.getRepositoryIssueDetail
);

// 저장소 컨텍스트 기반 질문 답변 - Flask API 연동
router.post(
  '/:repoId/ask',
  authenticate,
  repositoryController.askRepositoryQuestion
);

export default router;
