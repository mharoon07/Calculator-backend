import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  password: { type: String },
  role: { type: String, default: "user" },
  photo: { type: String, default: "" },

  // Auth fields
  googleId: { type: String },
  authProvider: { type: String, default: "email" },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  lastLogin: { type: Date },

  // Subscription fields
  plan: { type: String, default: "free" }, // 'free', 'monthly', 'yearly'
  planType: { type: String }, // 'month', 'year'
  subscriptionStatus: { type: String, default: "inactive" }, // 'active', 'inactive'
  subscriptionId: { type: String },
  planExpiryDate: { type: Date },
  calculationUsageCount: { type: Number, default: 0 },
  stripeCustomerId: { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const User = mongoose.model("User", userSchema);
export default User;