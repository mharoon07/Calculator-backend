import express from 'express';
import { createCheckoutSession, verifyCheckoutSession } from '../../Controllers/admin/payment.js';

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/verify-session', verifyCheckoutSession);

export default router;
