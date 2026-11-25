import { sendContactEmail } from '../lib/emailService.js';

export const submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required fields."
            });
        }

        const result = await sendContactEmail({ name, email, subject, message });

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: "Message sent successfully!"
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to send email. Please try again later.",
                error: result.error
            });
        }
    } catch (error) {
        console.error("Contact form error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

export const joinWaitlist = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const { sendWaitlistEmail, sendWaitlistConfirmationEmail } = await import('../lib/emailService.js');

        // Run both email tasks in parallel for speed
        const [adminEmailResult, userEmailResult] = await Promise.all([
            sendWaitlistEmail(email),
            sendWaitlistConfirmationEmail(email)
        ]);

        if (adminEmailResult.success || userEmailResult.success) {
            return res.status(200).json({ success: true, message: "Successfully joined waitlist!" });
        } else {
            console.error("Errors sending emails:", { admin: adminEmailResult.error, user: userEmailResult.error });
            // Even if email fails, we might want to say success to the user if we saved to DB (omitted here for brevity)
            // But since this is purely email-based for now:
            return res.status(500).json({ success: false, message: "Failed to join waitlist." });
        }
    } catch (error) {
        console.error("Waitlist error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};
