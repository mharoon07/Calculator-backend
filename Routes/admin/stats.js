import express from "express";
import {
    getDashboardStats,
    logCalculatorUsage,
    getUserStats
} from "../../Controllers/admin/stats.js";

const router = express.Router();

// Get comprehensive dashboard statistics
router.get("/dashboard", getDashboardStats);

// Log calculator usage
router.post("/usage", logCalculatorUsage);

// Get user statistics
router.get("/users", getUserStats);

export default router;
