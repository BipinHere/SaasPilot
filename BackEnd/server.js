
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import http from "http";

import connectDB from "./config/db.js";
import { initializeSocket } from "./sockets/socket.js";

import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);

// Test Route
app.get("/", (req, res) => {
    res.json({ message: "FlowForge API is running" });
});

// Socket.IO
initializeSocket(server);

// Start Server
const startServer = async () => {
    try {
        await connectDB();

        server.listen(process.env.PORT, () =>
            console.log(`Server running on port ${process.env.PORT}`)
        );
    } catch (error) {
        console.error("Server startup error:", error);
        process.exit(1);
    }
};

startServer();
