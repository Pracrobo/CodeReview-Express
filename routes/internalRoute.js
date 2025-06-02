import express from 'express';
import { handleAnalysisComplete } from '../controllers/internalController.js';

const router = express.Router();

// Flask에서 분석 완료 콜백
router.post('/analysis-complete', handleAnalysisComplete);

export default router;
