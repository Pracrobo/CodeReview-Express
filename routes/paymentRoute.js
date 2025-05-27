import express from 'express';
import { paymentComplete, getPaymentStatus } from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/complete', authenticate, paymentComplete);
router.get('/status', authenticate, getPaymentStatus);

export default router;