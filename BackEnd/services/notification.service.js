import Notification from "../models/notification.model.js";
import { getIO } from "../sockets/socket.js";

export const sendNotification = async (data) => {
    try {
        const notification = await Notification.create(data);

        getIO().to(`user:${data.recipient}`).emit(
            "notification",
            notification
        );

        return notification;
    } catch (error) {
        console.error("Notification error:", error);
        throw error;
    }
};