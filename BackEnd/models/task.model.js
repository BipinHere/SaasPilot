
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        assignedTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["todo", "in-progress", "review", "completed"],
            default: "todo"
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium"
        },

        dueDate: {
            type: Date,
            default: null
        },

        labels: [{
            type: String,
            trim: true
        }],

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ organization: 1, assignedTo: 1 });

const Task = mongoose.model("Task", taskSchema);

export default Task;
