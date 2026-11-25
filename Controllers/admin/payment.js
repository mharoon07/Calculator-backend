import Stripe from 'stripe';
import dotenv from 'dotenv';
import User from '../../Models/User.js';

dotenv.config();

// Initialize Stripe with a fallback to prevent crash on startup if .env is missing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const createCheckoutSession = async (req, res) => {
    try {
        const { planId, planName, price, interval, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Base domain for redirection
        const domain = process.env.CLIENT_URL || 'http://localhost:5173';

        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            client_reference_id: userId,  
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: planName,
                            description: `Subscription to ${planName} plan (${interval})`,
                        },
                        unit_amount: price * 100, // Amount in cents
                        recurring: interval !== 'month' && interval !== 'year' ? undefined : {
                            interval: interval === 'year' ? 'year' : 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: interval === 'forever' ? 'payment' : 'subscription', // Handle one-time vs subscription
            success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/pricing`,
            metadata: {
                planId: planId,
                planName: planName
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
};

export const verifyCheckoutSession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required' });
        }

        // 1. Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // 2. Check if paid
        if (session.payment_status === 'paid') {
            const userId = session.client_reference_id;
            const planId = session.metadata.planId;
            const planName = session.metadata.planName;

            if (userId) {
                // Retrieve subscription details to get the interval
                let interval = 'month'; // default
                let actualPlan = 'monthly'; // default

                if (session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    interval = subscription.items.data[0]?.price?.recurring?.interval || 'month';

                    // Map interval to plan name
                    actualPlan = interval === 'year' ? 'yearly' : 'monthly';
                } else {
                    // For one-time payments, check line items
                    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
                    const firstItem = lineItems.data[0];
                    if (firstItem?.price?.recurring) {
                        interval = firstItem.price.recurring.interval;
                        actualPlan = interval === 'year' ? 'yearly' : 'monthly';
                    }
                }

                // Calculate plan expiry date
                const now = new Date();
                const expiryDate = new Date(now);
                if (interval === 'year') {
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                } else {
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                }

                // 3. Update User in DB with correct plan
                const updatedUser = await User.findByIdAndUpdate(userId, {
                    plan: actualPlan,              // 'monthly' or 'yearly'
                    planType: interval,            // 'month' or 'year'
                    subscriptionStatus: 'active',
                    subscriptionId: session.subscription || null,
                    planExpiryDate: expiryDate.toISOString(),
                    updatedAt: new Date()
                }, { new: true });

                if (!updatedUser) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                return res.json({
                    success: true,
                    message: 'Payment verified and subscription activated!',
                    user: updatedUser
                });
            }
        }

        return res.status(400).json({ success: false, message: 'Payment not successful or user not found' });

    } catch (error) {
        console.error('Error verifying session:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
