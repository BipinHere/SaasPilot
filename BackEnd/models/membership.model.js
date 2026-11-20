
import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
    {
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },

    role: {
        type: String,
        enum: ["owner", "admin","project_manager", "member"],
        default: "member",
    },

    status: {
        type: String,
        enum: ["pending", "active"],
        default: "active",
    },

    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    },
    {
    timestamps: true,
    }
);

// Prevent duplicate memberships
membershipSchema.index(
    { user: 1, organization: 1 },
    { unique: true }
);

const Membership = mongoose.model(
    "Membership",
    membershipSchema
);

export default Membership;
