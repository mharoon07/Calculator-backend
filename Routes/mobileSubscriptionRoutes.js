import express from 'express';
import { createPaymentSheet, handleStripeWebhook } from '../Controllers/mobileSubscription.js';

const router = express.Router();

router.post('/create-payment-sheet', createPaymentSheet);
// The webhook route must remain unaffected by global body parsers 
// We will mount this separately in index.js to use express.raw({ type: 'application/json' })

export default router;
