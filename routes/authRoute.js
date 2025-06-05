import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GitHub 로그인 페이지로 리다이렉트
router.get('/github/login', authController.login);

// GitHub OAuth 콜백 처리 후 프론트엔드로 리다이렉트
router.get('/github/callback', authController.githubRedirect);

// 프론트엔드에서 받은 코드로 로그인 처리 및 토큰 발급
router.post('/github/callback', authController.callback);

// 액세스 토큰 갱신
router.post('/token/refresh', authController.refreshAccessToken);

// 로그아웃 (인증 필요)
router.post('/logout', authenticate, authController.logout);

// 계정 연동 해제 (인증 필요)
router.post('/unlink', authenticate, authController.unlink);

// 계정 삭제 (인증 필요)
router.delete('/delete', authenticate, authController.deleteAccount);

export default router;
