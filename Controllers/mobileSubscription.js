import express from 'express';
import Stripe from 'stripe';
import User from '../Models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentSheet = async (req, res) => {
    try {
        const { priceId, userId } = req.body;

        if (!priceId || !userId) {
            return res.status(400).json({ error: 'priceId and userId are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let customerId = user.stripeCustomerId;

        // 1. Get or Create a Customer
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
            });
            customerId = customer.id;
            user.stripeCustomerId = customerId;
            await user.save();
        }

        // 2. Create an Ephemeral Key
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: '2023-10-16' } // Keep or update the api validation version if you want
        );

        // 3. Create an Incomplete Subscription
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
        });

        if (!subscription.latest_invoice || !subscription.latest_invoice.payment_intent) {
            return res.status(500).json({ error: 'Failed to create payment intent' });
        }

        // 4. Return the required properties to the mobile client
        res.json({
            paymentIntent: subscription.latest_invoice.payment_intent.client_secret,
            ephemeralKey: ephemeralKey.secret,
            customer: customerId,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            subscriptionId: subscription.id,
        });
    } catch (error) {
        console.error('Error creating payment sheet:', error);
        res.status(500).json({ error: error.message });
    }
};

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Note: req.body MUST be raw buffer for verify to work. 
        // We will ensure this in index.js by mounting the webhook before express.json()
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'invoice.paid') {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        // Find user by stripeCustomerId
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
            user.subscriptionStatus = 'active';
            user.subscriptionId = subscriptionId;
            user.plan = 'premium'; // Or derive plan from invoice.lines

            // Calculate next expiry logic if needed
            // user.planExpiryDate = new Date(invoice.lines.data[0].period.end * 1000); 

            await user.save();
            console.log(`User ${user.email} subscription activated via webhook.`);
        } else {
            console.log(`Webhook Error: No user found for customer ID ${customerId}`);
        }
    } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeCustomerId: subscription.customer });
        if (user) {
            user.subscriptionStatus = 'inactive';
            await user.save();
            console.log(`User ${user.email} subscription canceled.`);
        }
    }

    res.json({ received: true });
};
