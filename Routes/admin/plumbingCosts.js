import express from "express";
import {
  getPlumbingCosts,
  getPlumbingCostById,
  createPlumbingCost,
  updatePlumbingCost,
  deletePlumbingCost,
  bulkCreatePlumbingCosts,
  bulkUpdatePlumbingCosts,
  testBulkUpdate,
  getPlumbingCostsByCategory
} from "../../Controllers/admin/plumbingCosts.js";

const router = express.Router();

// Get all plumbing costs
router.get("/", getPlumbingCosts);

// Get plumbing costs by category
router.get("/category/:category", getPlumbingCostsByCategory);

// Get plumbing cost by ID
router.get("/:id", getPlumbingCostById);

// Create new plumbing cost item
router.post("/", createPlumbingCost);

// Bulk create plumbing cost items
router.post("/bulk", bulkCreatePlumbingCosts);

// Bulk update plumbing cost items
router.put("/bulk", bulkUpdatePlumbingCosts);

// Test bulk update endpoint
router.put("/test", testBulkUpdate);

// Update plumbing cost item
router.put("/:id", updatePlumbingCost);

// Delete plumbing cost item
router.delete("/:id", deletePlumbingCost);

export default router;
