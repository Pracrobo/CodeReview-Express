import express from 'express';
import {
  login,
  callback,
  logout,
  deleteAccount,
  githubRedirect,
  unlink,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js'; // 통합 인증 미들웨어

const router = express.Router();

// GitHub 로그인 페이지로 리다이렉트
router.get('/github/login', login);

// GitHub OAuth 콜백 처리 후 프론트엔드로 리다이렉트
router.get('/github/callback', githubRedirect);

// 프론트엔드에서 받은 코드로 로그인 처리 및 토큰 발급
router.post('/github/callback', callback);

// GitHub 로그아웃 (토큰 철회 및 쿠키 삭제) - 인증 필요
router.post('/github/logout', authenticate, logout);

// GitHub 계정 연동 해제 (grant 엔드포인트) - 인증 필요
router.post('/github/unlink', authenticate, unlink);

// 계정 삭제 - 인증 필요
router.delete('/github/delete', authenticate, deleteAccount);

export default router;
