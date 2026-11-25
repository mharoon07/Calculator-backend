import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Changed from EMAIL_PASSWORD to match .env
    },
});

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'; // Default to local frontend

/**
 * Send verification email
 */
export const sendVerificationEmail = async (email, name, otp) => {
    const mailOptions = {
        from: `"Construction Calculator" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '✅ Verify Your Email Address',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code-box { background: #508EED; color: white; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Construction Calculator!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${name},</h2>
                        <p>Thank you for signing up! Please use the verification code below to activate your account:</p>
                        
                        <div class="code-box">${otp}</div>
                        
                        <p><strong>This code will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 Construction Calculator. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Verification OTP sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, name, resetToken) => {
    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"Construction Calculator" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Reset Your Password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${name},</h2>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <center>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </center>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
                        <div class="warning">
                            <strong>⚠️ Important:</strong>
                            <ul>
                                <li>This link will expire in 1 hour</li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Your password won't change until you create a new one</li>
                            </ul>
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2025 Construction Calculator. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
};
/**
 * Send contact form email
 */
export const sendContactEmail = async (data) => {
    const { name, email, subject, message } = data;

    const mailOptions = {
        from: `"Contact Form" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send to support email
        replyTo: email,
        subject: `📩 New Contact Message: ${subject}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                    .header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; }
                    .content { padding: 20px 0; }
                    .field { margin-bottom: 10px; }
                    .label { font-weight: bold; color: #555; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Contact Form Submission</h2>
                    </div>
                    <div class="content">
                        <div class="field">
                            <span class="label">Name:</span> ${name}
                        </div>
                        <div class="field">
                            <span class="label">Email:</span> ${email}
                        </div>
                        <div class="field">
                            <span class="label">Subject:</span> ${subject}
                        </div>
                        <div class="field">
                            <span class="label">Message:</span><br/>
                            <p style="background: #f9f9f9; padding: 10px; border-left: 3px solid #007bff;">
                                ${message.replace(/\n/g, '<br/>')}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Contact email sent from:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending contact email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send waitlist notification email
 */
export const sendWaitlistEmail = async (email) => {
    const mailOptions = {
        from: `"Waitlist Bot" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send to support email
        subject: `🚀 New Waitlist Signup: ${email}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                    .header { background: #e0f2f1; padding: 15px; border-bottom: 1px solid #b2dfdb; color: #00695c; }
                    .content { padding: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>New Auto Take AI Waitlist Signup</h2>
                    </div>
                    <div class="content">
                        <p><strong>Email:</strong> ${email}</p>
                        <p>A new user has requested early access to Auto Take AI.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Waitlist email sent for:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending waitlist email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send waitlist confirmation email to user
 */
export const sendWaitlistConfirmationEmail = async (email) => {
    const mailOptions = {
        from: `"Construction Calculator" <${process.env.EMAIL_USER}>`,
        to: email, // Send to the user who signed up
        subject: '🚀 You\'re on the list! Auto Take AI is coming.',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f6; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
                    .content { padding: 40px 30px; }
                    .highlight-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; margin: 25px 0; }
                    .benefit-item { display: flex; align-items: start; margin-bottom: 15px; }
                    .checkmark { color: #2563eb; margin-right: 12px; font-weight: bold; }
                    .footer { background: #f8fafc; padding: 25px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're on the list! 🚀</h1>
                    </div>
                    <div class="content">
                        <h2>Hi there,</h2>
                        <p>Thanks for your interest in <strong>Auto Take AI</strong>. We've successfully added <strong>${email}</strong> to our priority waitlist.</p>
                        
                        <p>You are now in line to be among the first to experience the future of automated construction estimation.</p>

                        <div class="highlight-box">
                            <h3 style="margin-top: 0; color: #1e3a8a;">What to expect:</h3>
                            <div class="benefit-item">
                                <span class="checkmark">✓</span>
                                <span>Early access to the beta release</span>
                            </div>
                            <div class="benefit-item">
                                <span class="checkmark">✓</span>
                                <span><strong>3 Months Free</strong> upon launch (exclusive to waitlist members)</span>
                            </div>
                            <div class="benefit-item">
                                <span class="checkmark">✓</span>
                                <span>Direct channel to provide feedback and shape the product</span>
                            </div>
                        </div>

                        <p>We'll notify you as soon as your spot opens up. In the meantime, feel free to explore our existing calculator suite.</p>
                        
                        <p>Best regards,<br>The Construction Calculator Team</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 Construction Calculator. All rights reserved.</p>
                        <p>You received this email because you signed up for the Auto Take AI waitlist.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Waitlist confirmation email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending waitlist confirmation email:', error);
        return { success: false, error: error.message };
    }
};
