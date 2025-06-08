import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import issueController from '../controllers/issueController.js';

const router = express.Router();

// 여러 저장소의 이슈를 한 번에 조회 (GET, 쿼리스트링 방식)
router.get('/bulk', authenticate, issueController.getIssuesByRepoIds);

// 최근 본 이슈 목록 조회 (limit/offset)
router.get('/recent', authenticate, issueController.getRecentIssues);

// 최근 본 이슈 저장 (POST)
router.post('/:issueId/recent', authenticate, issueController.saveRecentIssue);

// 이슈 AI 분석 요청 (POST)
router.post(
  '/:repoId/:issueNumber/analyze',
  authenticate,
  issueController.analyzeIssue
);

export default router;
