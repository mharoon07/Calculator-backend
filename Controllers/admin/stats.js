import Calculator from "../../Models/Calculator.js";
import User from "../../Models/User.js";
import CalculatorUsage from "../../Models/CalculatorUsage.js";
import ErrorLog from "../../Models/ErrorLog.js";

/**
 * Get comprehensive admin dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Fetch total calculators
        const totalCalculators = await Calculator.countDocuments({});

        // Fetch total users
        const totalUsers = await User.countDocuments({});

        // Fetch calculator usage logs
        let totalCalculations = 0;
        let calculationsToday = 0;

        try {
            totalCalculations = await CalculatorUsage.countDocuments({});

            // Get today's calculations
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            calculationsToday = await CalculatorUsage.countDocuments({
                createdAt: { $gte: today }
            });
        } catch (err) {
            console.log("⚠️ Error fetching calculator usage:", err);
        }

        // Calculate active users (users who logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let activeUsers = 0;
        try {
            activeUsers = await User.countDocuments({
                lastLogin: { $gte: thirtyDaysAgo }
            });
        } catch (err) {
            // If lastLogin field doesn't exist, consider all users as active
            activeUsers = totalUsers;
        }

        // Calculate success rate
        let successRate = 98.5;
        try {
            const totalErrors = await ErrorLog.countDocuments({});
            if (totalCalculations > 0) {
                successRate = ((totalCalculations - totalErrors) / totalCalculations) * 100;
                successRate = Math.max(0, Math.min(100, successRate)); // Clamp between 0-100
            }
        } catch (err) {
            console.log("⚠️ Error logs collection not found, using default success rate");
        }

        // Get weekly usage data for line chart
        const weeklyUsage = await getWeeklyUsage();

        // Get top 5 calculators by usage
        const topCalculators = await getTopCalculators();

        // Get calculator usage by type for bar chart
        const calculatorsByType = await getCalculatorsByType();

        // Get subscription statistics
        const subscriptionStats = await getSubscriptionStats();

        // Get weekly subscriber count
        const weeklySubscribers = await getWeeklySubscribers();

        res.json({
            success: true,
            stats: {
                totalCalculators,
                totalUsers,
                activeUsers,
                totalCalculations,
                calculationsToday,
                successRate: parseFloat(successRate.toFixed(2)),
                ...subscriptionStats.summary,
            },
            charts: {
                weeklyUsage,
                weeklySubscribers,
                topCalculators,
                calculatorsByType,
            },
            subscriptions: subscriptionStats,
        });
    } catch (err) {
        console.error("❌ Error fetching dashboard stats:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: err.message
        });
    }
};

/**
 * Get weekly usage data for the last 7 days
 */
const getWeeklyUsage = async () => {
    const weekData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    try {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await CalculatorUsage.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });

            weekData.push({
                name: days[date.getDay()],
                value: count,
            });
        }
    } catch (err) {
        console.error("Error fetching weekly usage:", err);
        return [
            { name: "Mon", value: 0 },
            { name: "Tue", value: 0 },
            { name: "Wed", value: 0 },
            { name: "Thu", value: 0 },
            { name: "Fri", value: 0 },
            { name: "Sat", value: 0 },
            { name: "Sun", value: 0 },
        ];
    }

    return weekData;
};

/**
 * Get weekly subscriber count for the last 7 days
 */
const getWeeklySubscribers = async () => {
    const weekData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    try {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            // Count users created on this day with active subscriptions
            const count = await User.countDocuments({
                createdAt: { $gte: date, $lt: nextDate },
                plan: { $in: ['monthly', 'yearly'] },
                subscriptionStatus: 'active'
            });

            weekData.push({
                name: days[date.getDay()],
                value: count,
            });
        }
    } catch (err) {
        console.log("⚠️ Error fetching weekly subscribers:", err);
        return [
            { name: "Mon", value: 0 },
            { name: "Tue", value: 0 },
            { name: "Wed", value: 0 },
            { name: "Thu", value: 0 },
            { name: "Fri", value: 0 },
            { name: "Sat", value: 0 },
            { name: "Sun", value: 0 },
        ];
    }

    return weekData;
};

/**
 * Get top 5 calculators by usage
 */
const getTopCalculators = async () => {
    try {
        const usageData = await CalculatorUsage.aggregate([
            { $group: { _id: "$calculatorId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const calculators = await Calculator.find({});
        const calcMap = {};
        calculators.forEach(c => calcMap[c._id.toString()] = c.title);

        const total = usageData.reduce((sum, item) => sum + item.count, 0);

        return usageData.slice(0, 5).map(item => ({
            name: calcMap[item._id] || "Unknown",
            value: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(2)) : 0,
        }));
    } catch (err) {
        console.error("Error fetching top calculators:", err);
        return [];
    }
};

/**
 * Get calculator usage by type for bar chart
 */
const getCalculatorsByType = async () => {
    try {
        const usageData = await CalculatorUsage.aggregate([
            { $group: { _id: "$calculatorId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const calculators = await Calculator.find({});
        const calcMap = {};
        calculators.forEach(c => calcMap[c._id.toString()] = c.title);

        return usageData.map(item => {
            const title = calcMap[item._id] || "Unknown";
            return {
                name: title.length > 15 ? title.substring(0, 15) + "..." : title,
                value: item.count,
            };
        });
    } catch (err) {
        console.error("Error fetching calculators by type:", err);
        return [];
    }
};

/**
 * Log calculator usage
 */
export const logCalculatorUsage = async (req, res) => {
    try {
        const { calculatorId, calculatorName, userId, userName } = req.body;

        if (!calculatorId) {
            return res.status(400).json({
                success: false,
                message: "Calculator ID is required"
            });
        }

        const newUsage = new CalculatorUsage({
            calculatorId,
            calculatorName: calculatorName || "Unknown",
            userId: userId || "anonymous",
            userName: userName || "Anonymous User",
            createdAt: new Date(),
        });

        await newUsage.save();

        res.json({
            success: true,
            message: "Usage logged successfully"
        });
    } catch (err) {
        console.error("❌ Error logging calculator usage:", err);
        res.status(500).json({
            success: false,
            message: "Failed to log usage",
            error: err.message
        });
    }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req, res) => {
    try {
        const users = await User.find({});

        // Count users by role
        const usersByRole = users.reduce((acc, user) => {
            const role = user.role || "user";
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        // Count users by plan
        const usersByPlan = users.reduce((acc, user) => {
            const plan = user.plan || "free";
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {});

        // Get new users this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });

        res.json({
            success: true,
            stats: {
                totalUsers: users.length,
                usersByRole,
                usersByPlan,
                newUsersThisMonth,
            },
        });
    } catch (err) {
        console.error("❌ Error fetching user stats:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user statistics",
            error: err.message
        });
    }
};

/**
 * Get subscription statistics
 */
const getSubscriptionStats = async () => {
    try {
        const users = await User.find({});

        // Count users by plan
        const planCounts = {
            free: 0,
            monthly: 0,
            yearly: 0,
        };

        // Count active subscriptions
        let activeSubscriptions = 0;
        let totalRevenue = 0;

        // Plan pricing
        const planPricing = {
            free: 0,
            monthly: 10,
            yearly: 95.00,
        };

        users.forEach(user => {
            const plan = (user.plan || "free").toLowerCase();
            const status = user.subscriptionStatus || "inactive";

            if (planCounts.hasOwnProperty(plan)) {
                planCounts[plan]++;
            } else {
                planCounts.free++;
            }

            if (status === "active" && plan !== "free") {
                activeSubscriptions++;
                // Add revenue based on plan
                totalRevenue += planPricing[plan] || 0;
            }
        });

        const mrr = totalRevenue;

        const subscriptionDistribution = Object.entries(planCounts).map(([plan, count]) => ({
            name: plan.charAt(0).toUpperCase() + plan.slice(1),
            value: count,
            percentage: users.length > 0 ? parseFloat(((count / users.length) * 100).toFixed(2)) : 0,
        }));

        const revenueByPlan = Object.entries(planCounts).map(([plan, count]) => {
            const price = planPricing[plan] || 0;
            const revenue = count * price;
            return {
                name: plan.charAt(0).toUpperCase() + plan.slice(1),
                value: revenue,
            };
        }).filter(item => item.value > 0);

        return {
            summary: {
                activeSubscriptions,
                monthlyRecurringRevenue: parseFloat(mrr.toFixed(2)),
                totalSubscribers: users.length,
                freeUsers: planCounts.free,
            },
            distribution: subscriptionDistribution,
            revenueByPlan,
            planCounts,
        };
    } catch (err) {
        console.error("⚠️ Error calculating subscription stats:", err);
        return {
            summary: {
                activeSubscriptions: 0,
                monthlyRecurringRevenue: 0,
                totalSubscribers: 0,
                freeUsers: 0,
            },
            distribution: [
                { name: "Free", value: 0, percentage: 0 },
                { name: "Monthly", value: 0, percentage: 0 },
                { name: "Yearly", value: 0, percentage: 0 },
            ],
            revenueByPlan: [],
            planCounts: {
                free: 0,
                monthly: 0,
                yearly: 0,
            },
        };
    }
};
