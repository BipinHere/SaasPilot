import express from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notification.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:notificationId/read", markAsRead);
router.delete("/:notificationId", deleteNotification);

export default router;