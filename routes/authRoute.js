import express from 'express';
import {
  login,
  githubRedirect,
  callback,
  refreshAccessToken,
  logout,
  unlink,
  deleteAccount,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GitHub 로그인 페이지로 리다이렉트
router.get('/github/login', login);

// GitHub OAuth 콜백 처리 후 프론트엔드로 리다이렉트
router.get('/github/callback', githubRedirect);

// 프론트엔드에서 받은 코드로 로그인 처리 및 토큰 발급
router.post('/github/callback', callback);

// 액세스 토큰 갱신
router.post('/token/refresh', refreshAccessToken);

// 로그아웃 (인증 필요)
router.post('/logout', authenticate, logout);

// 계정 연동 해제 (인증 필요)
router.post('/unlink', authenticate, unlink);

// 계정 삭제 (인증 필요)
router.delete('/delete', authenticate, deleteAccount);

export default router;
