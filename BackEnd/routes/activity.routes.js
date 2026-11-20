
import express from "express";

import {
  getOrganizationActivities
} from "../controllers/activity.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get organization activity history
router.get(
  "/:organizationId",
  authMiddleware,
  getOrganizationActivities
);

export default router;
