
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },

        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        status: {
            type: String,
            enum: ["active", "archived", "completed"],
            default: "active"
        },

        startDate: {
            type: Date,
            default: Date.now
        },

        dueDate: {
            type: Date,
            default: null
        },

        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

projectSchema.index({ organization: 1, name: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
