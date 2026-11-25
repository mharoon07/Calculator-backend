import express from "express";
import {
  getCalculators,
  addCalculator,
  updateCalculator,
  deleteCalculator,
  getSubtypes,
  getGreyStructureMaterialCosts,
  updateSubtype,
  getSubtypeDetails,
  updateSubtypeDetails

} from "../../Controllers/admin/calculators.js";
import multer from "multer";

import { getFinishingRates, updateFinishingItem } from "./getFinishingCosts.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.get("/", getCalculators);
router.post("/", addCalculator);
router.put("/:id", updateCalculator);
router.delete("/:id", deleteCalculator);
router.get("/:id/subtypes", getSubtypes);
router.get("/:calculatorId/subtypes/:subtypeId/materials", getGreyStructureMaterialCosts);
router.get("/:calculatorId/subtypes/:subtypeId/finishing-rates", getFinishingRates);
router.put("/:calculatorId/subtypes/:subtypeId/finishing-rates", updateFinishingItem);
router.post("/:calculatorId/subtypes/:subtypeId", updateSubtype);
router.get("/:calculatorId/subtypes/:subtypeId", getSubtypeDetails);
router.put("/:calculatorId/subtypes/:subtypeId", updateSubtypeDetails);



export default router;