import express from 'express';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.get('/stream', notificationController.initializeSseConnection);

export default router;
