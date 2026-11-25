import Project from "../../Models/Project.js";
import SiteAdmin from "../../Models/SiteAdmin.js";
import crypto from "crypto";

// Helper function to hash PIN using SHA-256
const hashPIN = (pin) => {
  return crypto.createHash("sha256").update(pin).digest("hex");
};

// Helper function to verify PIN
const verifyPIN = (pin, hash) => {
  return hashPIN(pin) === hash;
};

// Set or update Admin PIN
export const setAdminPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 6) {
      return res.status(400).json({
        success: false,
        message: "PIN must be at least 6 characters long",
      });
    }

    const pinHash = hashPIN(pin);

    // Check if admin settings document exists
    let adminDoc = await SiteAdmin.findById("admin_settings");

    if (adminDoc) {
      adminDoc.adminPinHash = pinHash;
      adminDoc.updatedAt = new Date();
      await adminDoc.save();
    } else {
      adminDoc = new SiteAdmin({
        _id: "admin_settings",
        adminPinHash: pinHash,
        supervisorPinHash: null,
      });
      await adminDoc.save();
    }

    res.json({
      success: true,
      message: "Admin PIN set successfully",
    });
  } catch (err) {
    console.error("❌ Error setting admin PIN:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Verify Admin PIN
export const verifyAdminPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required",
      });
    }

    const adminDoc = await SiteAdmin.findById("admin_settings");

    if (!adminDoc) {
      return res.status(404).json({
        success: false,
        message: "Admin PIN not set",
      });
    }

    const isValid = verifyPIN(pin, adminDoc.adminPinHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN",
      });
    }

    res.json({
      success: true,
      message: "PIN verified successfully",
    });
  } catch (err) {
    console.error("❌ Error verifying admin PIN:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Set or update Supervisor PIN
export const setSupervisorPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 6) {
      return res.status(400).json({
        success: false,
        message: "PIN must be at least 6 characters long",
      });
    }

    const pinHash = hashPIN(pin);

    // Check if admin settings document exists
    let adminDoc = await SiteAdmin.findById("admin_settings");

    if (adminDoc) {
      adminDoc.supervisorPinHash = pinHash;
      adminDoc.updatedAt = new Date();
      await adminDoc.save();
    } else {
      adminDoc = new SiteAdmin({
        _id: "admin_settings",
        adminPinHash: null,
        supervisorPinHash: pinHash,
      });
      await adminDoc.save();
    }

    res.json({
      success: true,
      message: "Supervisor PIN set successfully",
    });
  } catch (err) {
    console.error("❌ Error setting supervisor PIN:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Verify Supervisor PIN
export const verifySupervisorPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required",
      });
    }

    const adminDoc = await SiteAdmin.findById("admin_settings");

    if (!adminDoc) {
      return res.status(404).json({
        success: false,
        message: "Supervisor PIN not set",
      });
    }

    const isValid = verifyPIN(pin, adminDoc.supervisorPinHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN",
      });
    }

    res.json({
      success: true,
      message: "PIN verified successfully",
    });
  } catch (err) {
    console.error("❌ Error verifying supervisor PIN:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Check PIN status
export const checkPINStatus = async (req, res) => {
  try {
    const adminDoc = await SiteAdmin.findById("admin_settings");

    if (!adminDoc) {
      return res.json({
        success: true,
        adminPinSet: false,
        supervisorPinSet: false,
      });
    }

    res.json({
      success: true,
      adminPinSet: !!adminDoc.adminPinHash,
      supervisorPinSet: !!adminDoc.supervisorPinHash,
    });
  } catch (err) {
    console.error("❌ Error checking PIN status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({});

    res.json({
      success: true,
      projects: projects.reduce((acc, project) => {
        acc[project._id.toString()] = project;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a single project
export const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      project: project,
    });
  } catch (err) {
    console.error("❌ Error fetching project:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create a new project
export const createProject = async (req, res) => {
  try {
    const { name, settings } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const newProject = new Project({
      name,
      settings: settings || {},
      elements: [],
      logs: [],
      payments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newProject.save();

    res.json({
      success: true,
      project: newProject,
    });
  } catch (err) {
    console.error("❌ Error creating project:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update a project
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, settings } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (name !== undefined) project.name = name;
    if (settings !== undefined) project.settings = settings;
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (err) {
    console.error("❌ Error updating project:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const deleted = await Project.findByIdAndDelete(projectId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add an element to a project
export const addElement = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, unit, targetQty, contractValue, plannedWeeklyQty } =
      req.body;

    if (!projectId || !name) {
      return res.status(400).json({
        success: false,
        message: "Project ID and element name are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const newElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      unit: unit ? unit.trim() : "",
      targetQty: targetQty ? parseFloat(targetQty) : 0,
      contractValue: contractValue ? parseFloat(contractValue) : 0,
      plannedWeeklyQty: plannedWeeklyQty ? parseFloat(plannedWeeklyQty) : 0,
    };

    project.elements.push(newElement);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      element: newElement,
    });
  } catch (err) {
    console.error("❌ Error adding element:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update an element
export const updateElement = async (req, res) => {
  try {
    const { projectId, elementId } = req.params;
    const { name, unit, targetQty, contractValue, plannedWeeklyQty } =
      req.body;

    if (!projectId || !elementId) {
      return res.status(400).json({
        success: false,
        message: "Project ID and element ID are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const elementIndex = project.elements.findIndex((el) => el.id === elementId);

    if (elementIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Element not found",
      });
    }

    if (name !== undefined) project.elements[elementIndex].name = name.trim();
    if (unit !== undefined) project.elements[elementIndex].unit = unit.trim();
    if (targetQty !== undefined)
      project.elements[elementIndex].targetQty = parseFloat(targetQty);
    if (contractValue !== undefined)
      project.elements[elementIndex].contractValue = parseFloat(contractValue);
    if (plannedWeeklyQty !== undefined)
      project.elements[elementIndex].plannedWeeklyQty = parseFloat(plannedWeeklyQty);

    project.updatedAt = new Date();
    await project.save();

    res.json({
      success: true,
      element: project.elements[elementIndex],
    });
  } catch (err) {
    console.error("❌ Error updating element:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete an element
export const deleteElement = async (req, res) => {
  try {
    const { projectId, elementId } = req.params;

    if (!projectId || !elementId) {
      return res.status(400).json({
        success: false,
        message: "Project ID and element ID are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    project.elements = project.elements.filter((el) => el.id !== elementId);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      message: "Element deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting element:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add a log entry
export const addLog = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      date,
      elementId,
      qty,
      location,
      workers,
      hours,
      quality,
      issues,
      photos,
    } = req.body;

    if (!projectId || !elementId || !date) {
      return res.status(400).json({
        success: false,
        message: "Project ID, element ID, and date are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const newLog = {
      date,
      elementId,
      qty: qty ? parseFloat(qty) : 0,
      location: location ? location.trim() : "",
      workers: workers ? parseFloat(workers) : 0,
      hours: hours ? parseFloat(hours) : 0,
      quality: quality ? quality.trim() : "",
      issues: issues ? issues.trim() : "",
      photos: Array.isArray(photos)
        ? photos
        : (photos && typeof photos === 'string'
          ? photos.split(",").map((s) => s.trim()).filter(Boolean)
          : []),
      createdAt: new Date(),
    };

    project.logs.push(newLog);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      log: newLog,
    });
  } catch (err) {
    console.error("❌ Error adding log:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update a log entry
export const updateLog = async (req, res) => {
  try {
    const { projectId, logIndex } = req.params;
    const {
      date,
      elementId,
      qty,
      location,
      workers,
      hours,
      quality,
      issues,
      photos,
    } = req.body;

    if (!projectId || logIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project ID and log index are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const index = parseInt(logIndex);

    if (index < 0 || index >= project.logs.length) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    if (date !== undefined) project.logs[index].date = date;
    if (elementId !== undefined) project.logs[index].elementId = elementId;
    if (qty !== undefined) project.logs[index].qty = parseFloat(qty);
    if (location !== undefined) project.logs[index].location = location.trim();
    if (workers !== undefined) project.logs[index].workers = parseFloat(workers);
    if (hours !== undefined) project.logs[index].hours = parseFloat(hours);
    if (quality !== undefined) project.logs[index].quality = quality.trim();
    if (issues !== undefined) project.logs[index].issues = issues.trim();
    if (photos !== undefined) {
      project.logs[index].photos = Array.isArray(photos)
        ? photos
        : (photos && typeof photos === 'string'
          ? photos.split(",").map((s) => s.trim()).filter(Boolean)
          : []);
    }

    project.updatedAt = new Date();
    await project.save();

    res.json({
      success: true,
      log: project.logs[index],
    });
  } catch (err) {
    console.error("❌ Error updating log:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete a log entry
export const deleteLog = async (req, res) => {
  try {
    const { projectId, logIndex } = req.params;

    if (!projectId || logIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project ID and log index are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const index = parseInt(logIndex);

    if (index < 0 || index >= project.logs.length) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    project.logs.splice(index, 1);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      message: "Log deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting log:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add a payment
export const addPayment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date, amount, ref, elementId } = req.body;

    if (!projectId || !date || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project ID, date, and amount are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const newPayment = {
      date,
      amount: parseFloat(amount),
      ref: ref ? ref.trim() : "",
      elementId: elementId || null,
      createdAt: new Date(),
    };

    project.payments.push(newPayment);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      payment: newPayment,
    });
  } catch (err) {
    console.error("❌ Error adding payment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update a payment
export const updatePayment = async (req, res) => {
  try {
    const { projectId, paymentIndex } = req.params;
    const { date, amount, ref, elementId } = req.body;

    if (!projectId || paymentIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project ID and payment index are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const index = parseInt(paymentIndex);

    if (index < 0 || index >= project.payments.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (date !== undefined) project.payments[index].date = date;
    if (amount !== undefined) project.payments[index].amount = parseFloat(amount);
    if (ref !== undefined) project.payments[index].ref = ref.trim();
    if (elementId !== undefined) project.payments[index].elementId = elementId || null;

    project.updatedAt = new Date();
    await project.save();

    res.json({
      success: true,
      payment: project.payments[index],
    });
  } catch (err) {
    console.error("❌ Error updating payment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete a payment
export const deletePayment = async (req, res) => {
  try {
    const { projectId, paymentIndex } = req.params;

    if (!projectId || paymentIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Project ID and payment index are required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const index = parseInt(paymentIndex);

    if (index < 0 || index >= project.payments.length) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    project.payments.splice(index, 1);
    project.updatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting payment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
