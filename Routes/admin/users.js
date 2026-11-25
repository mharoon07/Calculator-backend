import express from "express";
import { getUsers, login, signup, googleLogin, forgotPassword, resetPassword, verifyEmail, getUserUsage, incrementUserUsage, getCurrentUser, getUser, updateUser, deleteUser, deleteAccount, fetchUserProfile, updateProfile, activateSubscription } from "../../Controllers/admin/users.js";
import upload from "../../utils/multer.js";

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get("/", getUsers);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get("/me", getCurrentUser);

/**
 * @swagger
 * /users/update-profile:
 *   post:
 *     summary: Update user profile (name, email, profile image)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User's ID
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 description: User's email address
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (max 5MB, images only)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Server error
 */
router.post("/update-profile", upload.single('profileImage'), updateProfile);

/**
 * @swagger
 * /users/fetch:
 *   post:
 *     summary: Fetch user by ID or Email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile found
 *       404:
 *         description: User not found
 */
router.post("/fetch", fetchUserProfile);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", login);

/**
 * @swagger
 * /users/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input or missing fields
 *       409:
 *         description: User already exists
 */
router.post("/signup", signup);

/**
 * @swagger
 * /users/google-login:
 *   post:
 *     summary: Login or Signup with Google
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               photo:
 *                 type: string
 *               googleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/google-login", googleLogin);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent (if email exists)
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset password using a valid token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /users/verify-email:
 *   post:
 *     summary: Verify user email with OTP
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid code or email
 */
router.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /users/usage:
 *   get:
 *     summary: Get user calculation usage count
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: User email
 *     responses:
 *       200:
 *         description: Usage count and plan details
 *       400:
 *         description: Email is required
 */
router.get("/usage", getUserUsage);

/**
 * @swagger
 * /users/usage/increment:
 *   post:
 *     summary: Increment usage count for free users
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usage incremented
 *       404:
 *         description: User not found
 */
router.post("/usage/increment", incrementUserUsage);

/**
 * @swagger
 * /users/subscription/activate:
 *   post:
 *     summary: Activate user subscription plan
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - plan
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User's ID
 *               plan:
 *                 type: string
 *                 enum: [free, monthly, yearly]
 *                 description: Subscription plan type
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *       400:
 *         description: Invalid input or missing fields
 *       404:
 *         description: User not found
 */
router.post("/subscription/activate", activateSubscription);

/**
 * @swagger
 * /users/delete-account:
 *   post:
 *     summary: Delete user account by ID
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: User's ID to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User not found
 */
router.post("/delete-account", deleteAccount);

/**
 * @swagger
 * /users/delete-account/{id}:
 *   delete:
 *     summary: Delete user account by ID parameter
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User's ID
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       404:
 *         description: User not found
 */
router.delete("/delete-account/:id", deleteAccount);

// User CRUD operations
router.get("/:id", getUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;