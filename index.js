import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import calculatorRoutes from './Routes/calculatorRoutes.js';
import userRoutes from './Routes/admin/users.js';
import plumbingCostsRoutes from './Routes/admin/plumbingCosts.js';
import adminCalculatorRoutes from './Routes/admin/calculators.js';
import companyRoutes from './Routes/admin/company.js';
import siteProgressRoutes from './Routes/admin/siteProgress.js';
import paymentRoutes from './Routes/admin/payment.js';
import statsRoutes from './Routes/admin/stats.js';
import connectDB from './lib/mongodb.js';
import usefulLinksRoutes from './Routes/admin/usefulLinks.js';
import contactRoutes from './Routes/contactRoutes.js';
import aiRoutes from './Routes/aiRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './lib/swagger.js';
import mobileSubscriptionRoutes from './Routes/mobileSubscriptionRoutes.js';
import { handleStripeWebhook } from './Controllers/mobileSubscription.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(cors({
  origin: '*', // allows requests from any domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(cors());

// Webhook must be parsed as raw body for stripe signature verification
app.post('/api/mobile-subscription/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Calculator API Routes (original)
app.use('/api/calculators', calculatorRoutes);

// Admin Routes
app.use('/users', userRoutes);
app.use('/calculators', adminCalculatorRoutes);
app.use('/company', companyRoutes);
app.use('/plumbing-costs', plumbingCostsRoutes);
app.use('/site-progress', siteProgressRoutes);
app.use('/payment', paymentRoutes);
app.use('/stats', statsRoutes);

app.use('/useful-links', usefulLinksRoutes);
app.use('/contact', contactRoutes);
app.use('/api/ai', aiRoutes);

// Mobile subscription
app.use('/api/mobile-subscription', mobileSubscriptionRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {

  res.send('Construction API - Calculator & Admin Backend');
});

// Connection handled by connectDB()

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Force restart trigger - loading new env vars
console.log("Updated env vars loaded.");  
