import Activity from "../models/activity.model.js";

const logActivity = async ({
  organization,
  actor,
  action,
  targetUser = null,
  details = "",
  metadata = {}
}) => {
  try {
    await Activity.create({
      organization,
      actor,
      action,
      targetUser,
      details,
      metadata
    });
  } catch (error) {
    // Logging failure should not break the main operation
    console.error("Activity logging error:", error);
  }
};

export default logActivity;
