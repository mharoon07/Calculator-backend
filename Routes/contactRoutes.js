import express from 'express';
import { submitContactForm, joinWaitlist } from '../Controllers/contactController.js';

const router = express.Router();

router.post('/', submitContactForm);
router.post('/waitlist', joinWaitlist);

export default router;
