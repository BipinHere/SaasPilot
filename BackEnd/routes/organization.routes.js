
import express from "express";
import {
    createOrganization,
    getUserOrganizations,
    getOrganizationMembers,
    removeOrganizationMember,
    updateMemberRole,
    deleteOrganization,
    transferOrganizationOwnership,
    getOrganizationDetails,
    updateOrganizationDetails
} from "../controllers/organization.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Organization
router.post("/", createOrganization);
router.get("/user", getUserOrganizations);
router.get("/:organizationId", getOrganizationDetails);
router.put("/:organizationId", updateOrganizationDetails);
router.delete("/:organizationId", deleteOrganization);

// Members
router.get("/:organizationId/members", getOrganizationMembers);
router.delete("/:organizationId/members/:memberId", removeOrganizationMember);
router.put("/:organizationId/members/:memberId", updateMemberRole);

// Ownership
router.put("/:organizationId/ownership", transferOrganizationOwnership);

export default router;
