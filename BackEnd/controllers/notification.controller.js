import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

// Get notifications
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("sender", "name")
            .sort({ createdAt: -1 });

        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark one as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!mongoose.isValidObjectId(notificationId))
            return res.status(400).json({ message: "Invalid ID" });

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification)
            return res.status(404).json({ message: "Notification not found" });

        res.json({ notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!mongoose.isValidObjectId(notificationId))
            return res.status(400).json({ message: "Invalid ID" });

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: req.user._id
        });

        if (!notification)
            return res.status(404).json({ message: "Notification not found" });

        res.json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};