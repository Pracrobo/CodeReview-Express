import express from 'express';
import { login, callback, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/github/login', login);
router.get('/github/callback', callback);
router.post('/github/logout', logout);

export default router;
