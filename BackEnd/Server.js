import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";

import connectDB from "./config/db.js";

dotenv.config();

const app = express();

// Middleware
app.use(helmet());

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Welcome to FlowForge API",
        status: "Running successfully"
    });
});

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
};

startServer();