import express from 'express';
import { sseSetting } from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stream', sseSetting);

export default router;
