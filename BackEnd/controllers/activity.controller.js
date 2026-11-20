
import mongoose from "mongoose";
import Activity from "../models/activity.model.js";
import Membership from "../models/membership.model.js";

export const getOrganizationActivities = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    // Validate organization ID
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        message: "Invalid organization ID"
      });
    }

    // Check whether user is an active member
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: organizationId,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization"
      });
    }

    // Fetch activity logs
    const activities = await Activity.find({
      organization: organizationId
    })
      .populate("actor", "name email")
      .populate("targetUser", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalActivities = await Activity.countDocuments({
      organization: organizationId
    });

    return res.status(200).json({
      message: "Organization activities fetched successfully",
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        totalActivities,
        limit
      },
      activities
    });

  } catch (error) {
    console.error("Get organization activities error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
