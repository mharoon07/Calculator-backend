import express from "express";
import { getCompany, addCompany, updateCompany } from "../../Controllers/admin/company.js";

const router = express.Router();

router.get("/", getCompany);
router.post("/", addCompany);
router.put("/", updateCompany);

export default router;