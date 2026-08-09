import { Router } from "express";

import {
  getLivenessHealth,
  getReadinessHealth,
} from "../controllers/health.controller.js";

const router = Router();

/*
 * /health remains the Railway deployment readiness endpoint for backwards
 * compatibility. /health/ready is the explicit equivalent for operators.
 */
router.get("/health", getReadinessHealth);
router.get("/health/ready", getReadinessHealth);
router.get("/health/live", getLivenessHealth);

export default router;