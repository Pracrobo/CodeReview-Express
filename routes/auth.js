import express from 'express';
import { login, callback, logout, deleteAccount, githubRedirect } from '../controllers/authController.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/github/login', login);
router.get('/github/callback', githubRedirect); // GET: code → 프론트엔드로 리다이렉트
router.post('/github/callback', callback);      // POST: code → 토큰 JSON 응답
router.post('/github/logout', verifyJWT, logout);
router.delete('/github/delete', verifyJWT, deleteAccount);

export default router;
