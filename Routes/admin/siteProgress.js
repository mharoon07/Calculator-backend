import express from "express";
import {
  setAdminPIN,
  verifyAdminPIN,
  setSupervisorPIN,
  verifySupervisorPIN,
  checkPINStatus,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addElement,
  updateElement,
  deleteElement,
  addLog,
  updateLog,
  deleteLog,
  addPayment,
  updatePayment,
  deletePayment,
} from "../../Controllers/admin/siteProgress.js";

const router = express.Router();

// PIN status check
router.get("/pin-status", checkPINStatus);

// Admin PIN routes
router.post("/admin/pin", setAdminPIN);
router.post("/admin/verify", verifyAdminPIN);

// Supervisor PIN routes
router.post("/supervisor/pin", setSupervisorPIN);
router.post("/supervisor/verify", verifySupervisorPIN);

// Project routes
router.get("/projects", getProjects);
router.get("/projects/:projectId", getProject);
router.post("/projects", createProject);
router.put("/projects/:projectId", updateProject);
router.delete("/projects/:projectId", deleteProject);

// Element routes
router.post("/projects/:projectId/elements", addElement);
router.put("/projects/:projectId/elements/:elementId", updateElement);
router.delete("/projects/:projectId/elements/:elementId", deleteElement);

// Log routes
router.post("/projects/:projectId/logs", addLog);
router.put("/projects/:projectId/logs/:logIndex", updateLog);
router.delete("/projects/:projectId/logs/:logIndex", deleteLog);

// Payment routes
router.post("/projects/:projectId/payments", addPayment);
router.put("/projects/:projectId/payments/:paymentIndex", updatePayment);
router.delete("/projects/:projectId/payments/:paymentIndex", deletePayment);

export default router;
