
import express from "express";
import {
    createProject,
    getProjects,
    getProjectDetails,
    updateProject,
    deleteProject,
    addProjectMember,
    removeProjectMember
} from "../controllers/project.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Project routes
router.post("/", createProject);
router.get("/organization/:organizationId", getProjects);
router.get("/:projectId", getProjectDetails);
router.put("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

// Project member routes
router.post("/:projectId/members", addProjectMember);
router.delete("/:projectId/members/:userId", removeProjectMember);

export default router;
