
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

// Read token from browser cookie header
const getToken = (cookieHeader = "") => {
    const cookies = cookieHeader.split(";");

    for (const cookie of cookies) {
        const [key, ...value] = cookie.trim().split("=");

        if (key === "token") {
            return decodeURIComponent(value.join("="));
        }
    }

    return null;
};

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = getToken(
                socket.handshake.headers.cookie || ""
            );

            if (!token) {
                return next(new Error("Unauthorized"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;

            next();
        } catch (error) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.userId}`);

        socket.join(`user:${socket.userId}`);

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.userId}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket not initialized");
    }

    return io;
};
