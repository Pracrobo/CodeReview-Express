import express from 'express';
import { sseSetting } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/stream', sseSetting);

export default router;
