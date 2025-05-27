import express from 'express';
import {
  login,
  callback,
  logout,
  deleteAccount,
  githubRedirect,
} from '../controllers/authController.js';
import { verifyJWT } from '../middlewares/auth.js'; // JWT 검증 미들웨어

const router = express.Router();

// GitHub 로그인 요청 시작
router.get('/github/login', login);

// GitHub OAuth 콜백 처리 후 프론트엔드로 리다이렉트
router.get('/github/callback', githubRedirect);

// 프론트엔드에서 받은 코드로 실제 로그인 처리 및 토큰 발급
router.post('/github/callback', callback);

// 로그아웃 (GitHub 토큰 철회 포함) - JWT 인증 필요
router.post('/github/logout', verifyJWT, logout);

// 계정 삭제 - JWT 인증 필요
router.delete('/github/delete', verifyJWT, deleteAccount);

export default router;
