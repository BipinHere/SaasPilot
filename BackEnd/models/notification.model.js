import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        default: null
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        default: null
    },
    type: {
        type: String,
        enum: [
            "invitation",
            "task_assigned",
            "task_updated",
            "comment",
            "project_update",
            "member_update"
        ],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;