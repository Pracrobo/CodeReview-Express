import express from 'express';
import { login, callback, logout, deleteAccount } from '../controllers/authController.js';
import { verifyJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/github/login', login);
router.get('/github/callback', callback);
router.post('/github/logout', logout);
router.delete('/github/delete', verifyJWT, deleteAccount);

export default router;
