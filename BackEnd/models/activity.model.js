
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    action: {
      type: String,
      required: true,
      enum: [
        "organization_created",
        "member_invited",
        "invitation_accepted",
        "invitation_rejected",
        "member_removed",
        "member_role_updated",
        "ownership_transferred",
        "organization_updated",
        "organization_deleted"
      ]
    },

    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    details: {
      type: String,
      default: ""
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Retrieve organization activity newest first
activitySchema.index({
  organization: 1,
  createdAt: -1
});

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
