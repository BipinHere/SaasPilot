
import express from "express";
import {
    addComment,
    getComments,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Task comments
router.post("/task/:taskId", addComment);
router.get("/task/:taskId", getComments);

// Edit and delete comments
router.put("/:commentId", updateComment);
router.delete("/:commentId", deleteComment);

export default router;
