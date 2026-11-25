import jwt from "jsonwebtoken";
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from "../../Models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/emailService.js';
import cloudinary from '../../utils/cloudinary.js';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const signup = async (req, res) => {
  const { firstName, lastName, email, password, name } = req.body;

  try {
    // Validate required fields
    // if (!firstName || !lastName || !email || !password) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "❌ First name, last name, email, and password are required"
    //   });
    // }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "❌ User with this email already exists"
      });
    }

    // Create new user
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: `${firstName} ${lastName}`.trim(),
      email: email,
      password: hashedPassword,
      role: "user", // Default role
      plan: "free", // Default plan
      calculationUsageCount: 0, // Initialize usage count
      emailVerified: false,
      verificationToken,
      createdAt: new Date(),
    });

    await newUser.save();

    // Send verification email
    await sendVerificationEmail(email, `${firstName} ${lastName}`, verificationToken);

    // Generate JWT token
    const token = jwt.sign({ email: newUser.email, id: newUser._id }, JWT_SECRET, {
      expiresIn: "3650d", // 10 years
    });

    return res.status(201).json({
      success: true,
      message: "✅ Account created! Please check your email for the verification code.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan || 'free',
        emailVerified: false
      },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ success: false, message: "Server error during signup" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "❌ Email and password are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "❌ User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "❌ Invalid password" });
    }

    // Check subscription expiry
    if (user.planExpiryDate && new Date(user.planExpiryDate) < new Date()) {
      user.plan = 'free';
      user.planExpiryDate = null;
      user.subscriptionStatus = 'expired';
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, {
      expiresIn: "3650d", // 10 years
    });

    return res.json({
      success: true,
      message: "✅ Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan || 'free',
        photo: user.photo,
        emailVerified: user.emailVerified
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const googleLogin = async (req, res) => {
  const { email, name, photo, googleId } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        name: name || "Google User",
        email: email,
        photo: photo || "",
        googleId: googleId,
        role: "user",
        createdAt: new Date(),
        authProvider: "google"
      });

      await user.save();
    } else {
      // Update last login for existing user
      user.lastLogin = new Date();
      await user.save();
    }

    const token = jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, {
      expiresIn: "3650d",
    });

    return res.json({
      success: true,
      message: "✅ Google Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
        plan: user.plan || 'free'
      },
    });

  } catch (err) {
    console.error("❌ Google Login error:", err);
    res.status(500).json({ success: false, message: "Server error during Google login" });
  }
};

/**
 * Request password reset
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: "If that email exists, we've sent a password reset link"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send email
    await sendPasswordResetEmail(email, user.name, resetToken);

    res.json({
      success: true,
      message: "Password reset link sent to your email"
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to process request"
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user with valid token
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Check if token expired
    if (new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired"
      });
    }

    // Update password and clear token
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reset password"
    });
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    // Find user with verification token (OTP) and email
    const user = await User.findOne({ email, verificationToken: code });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code or email"
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.verificationToken = null;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully!"
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify email"
    });
  }
};

// Get user's usage count
export const getUserUsage = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check subscription expiry
    if (user.planExpiryDate && new Date(user.planExpiryDate) < new Date()) {
      user.plan = 'free';
      user.planExpiryDate = null;
      user.subscriptionStatus = 'expired';
      await user.save();
    }

    const usageCount = user.calculationUsageCount || 0;
    const plan = user.plan || 'free';

    res.json({
      success: true,
      usageCount,
      plan
    });
  } catch (err) {
    console.error("Get usage error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get usage count"
    });
  }
};

// Increment user's usage count
export const incrementUserUsage = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const currentCount = user.calculationUsageCount || 0;
    const plan = user.plan || 'free';

    // Only increment for free users
    if (plan === 'free') {
      const newCount = currentCount + 1;

      user.calculationUsageCount = newCount;
      user.updatedAt = new Date();
      await user.save();

      console.log(`📈 User ${email} usage: ${currentCount} → ${newCount}`);

      res.json({
        success: true,
        usageCount: newCount,
        message: "Usage count incremented"
      });
    } else {
      res.json({
        success: true,
        usageCount: currentCount,
        message: "Pro user - usage not tracked"
      });
    }
  } catch (err) {
    console.error("Increment usage error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to increment usage count"
    });
  }
};

// Get current user's profile from database
export const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided"
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check subscription expiry
      if (user.planExpiryDate && new Date(user.planExpiryDate) < new Date()) {
        user.plan = 'free';
        user.planExpiryDate = null;
        user.subscriptionStatus = 'expired';
        await user.save();
      }

      // Return user profile with all relevant information
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role || 'user',
          plan: user.plan || 'free',
          photo: user.photo || '',
          emailVerified: user.emailVerified || false,
          calculationUsageCount: user.calculationUsageCount || 0,
          createdAt: user.createdAt,
          authProvider: user.authProvider || 'email'
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile"
    });
  }
};

// Get single user
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully", user });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Delete account based on ID
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.body?.id || req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "❌ User ID is required"
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "❌ User not found"
      });
    }

    return res.json({
      success: true,
      message: "✅ Account deleted successfully"
    });
  } catch (err) {
    console.error("❌ Delete account error:", err);
    res.status(500).json({ success: false, message: "Server error during account deletion" });
  }
};

/**
 * Update user profile (name, email, profile image)
 * Requires userId in request body
 */
export const updateProfile = async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const updateData = {};

    // Update name if provided
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Update email if provided and different from current
    if (email && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();

      // Check if email is different from current
      if (trimmedEmail !== user.email) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email: trimmedEmail });

        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
          return res.status(409).json({
            success: false,
            message: "Email is already in use by another account"
          });
        }

        updateData.email = trimmedEmail;
        // Mark email as unverified if changed
        updateData.emailVerified = false;
      }
    }

    // Handle profile image upload to Cloudinary
    if (req.file) {
      try {
        // Delete old image from Cloudinary if exists
        if (user.photo && user.photo.includes('cloudinary')) {
          // Extract public_id from the URL
          const urlParts = user.photo.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];

          try {
            await cloudinary.uploader.destroy(`user_profiles/${publicId}`);
          } catch (deleteError) {
            console.log('Error deleting old image:', deleteError);
            // Continue even if deletion fails
          }
        }

        // Upload new image to Cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'user_profiles',
              resource_type: 'image',
              transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end(req.file.buffer);
        });

        const uploadResult = await uploadPromise;
        updateData.photo = uploadResult.secure_url;

      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile image"
        });
      }
    }

    // Update timestamp
    updateData.updatedAt = new Date();

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Return updated user data
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        role: updatedUser.role,
        plan: updatedUser.plan || 'free',
        photo: updatedUser.photo || '',
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        authProvider: updatedUser.authProvider || 'email'
      }
    });

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};

// Fetch user by ID or Email
export const fetchUserProfile = async (req, res) => {
  try {
    const { id, email } = req.body;

    if (!id && !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide either 'id' or 'email' to fetch user."
      });
    }

    let user;
    if (id) {
      user = await User.findById(id);
    } else if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Return user info (excluding password)
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        subscriptionStatus: user.subscriptionStatus,
        calculationUsageCount: user.calculationUsageCount,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        plan: user.plan || 'free',
        photo: user.photo,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user"
    });
  }
};

/**
 * Activate user subscription plan
 * Updates user's plan and sets subscriptionStatus to active
 */
export const activateSubscription = async (req, res) => {
  try {
    const { userId, plan } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Plan type is required"
      });
    }

    // Validate plan type
    const validPlans = ['free', 'monthly', 'yearly'];
    if (!validPlans.includes(plan.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan type. Must be one of: ${validPlans.join(', ')}`
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Calculate expiry date based on plan
    let planExpiryDate = null;
    if (plan === 'monthly') {
      planExpiryDate = new Date();
      planExpiryDate.setMonth(planExpiryDate.getMonth() + 1);
    } else if (plan === 'yearly') {
      planExpiryDate = new Date();
      planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 1);
    }

    // Update user subscription
    user.plan = plan.toLowerCase();
    user.subscriptionStatus = 'active';
    user.planExpiryDate = planExpiryDate;
    user.updatedAt = new Date();

    await user.save();

    console.log(`✅ Subscription activated for user ${user.email}: ${plan}`);

    res.json({
      success: true,
      message: `Subscription activated successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        planExpiryDate: user.planExpiryDate
      }
    });

  } catch (err) {
    console.error("Activate subscription error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to activate subscription"
    });
  }
};