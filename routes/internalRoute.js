import express from 'express';
import internalController from '../controllers/internalController.js';

const router = express.Router();

// Flask에서 분석 완료 콜백
router.post('/analysis-complete', internalController.handleAnalysisComplete);

export default router;
