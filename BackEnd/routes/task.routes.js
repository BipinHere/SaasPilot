
import express from "express";
import {
    createTask,
    getTasks,
    getTaskDetails,
    updateTask,
    deleteTask,
    assignTask
} from "../controllers/task.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Task routes
router.post("/project/:projectId", createTask);
router.get("/project/:projectId", getTasks);
router.get("/:taskId", getTaskDetails);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

// Assign users
router.put("/:taskId/assign", assignTask);

export default router;
