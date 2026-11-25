import express from 'express';
import { analyzeDrawing } from '../Controllers/aiController.js';

const router = express.Router();

router.post('/analyze-drawing', analyzeDrawing);

export default router;
