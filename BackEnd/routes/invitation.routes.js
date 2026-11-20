
import express from "express";
import {
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    getPendingInvitations
} from "../controllers/invitation.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, sendInvitation);

router.post("/accept", authMiddleware, acceptInvitation);

router.post("/reject", authMiddleware, rejectInvitation);

router.get("/pending", authMiddleware, getPendingInvitations);

export default router;
