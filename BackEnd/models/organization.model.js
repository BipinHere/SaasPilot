
import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
    },

    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    description: {
        type: String,
        default: "",
        trim: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },

logo: {
        type: String,
        trim: true,
        default: ""
}
    },
    {
    timestamps: true,
    }
);

const Organization = mongoose.model(
    "Organization",
    organizationSchema
);

export default Organization;
