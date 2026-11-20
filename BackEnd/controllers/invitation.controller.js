
import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/user.model.js";
import Organization from "../models/organization.model.js";
import Membership from "../models/membership.model.js";
import Invitation from "../models/invitation.model.js";
import logActivity from "../utils/logActivity.js";
import { sendNotification } from "../services/notification.service.js";

// SEND INVITATION
export const sendInvitation = async (req, res) => {
    try {
        const { organizationId, email, role = "member" } = req.body;

        if (!organizationId || !email)
            return res.status(400).json({ message: "Organization ID and email required" });

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid organization ID" });

        if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            return res.status(400).json({ message: "Invalid email" });

        if (!["admin", "project_manager", "member"].includes(role))
            return res.status(400).json({ message: "Invalid role" });

        const normalizedEmail = email.trim().toLowerCase();
        const organization = await Organization.findById(organizationId);

        if (!organization)
            return res.status(404).json({ message: "Organization not found" });

        const membership = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!membership || !["owner", "admin"].includes(membership.role))
            return res.status(403).json({ message: "Not authorized to invite members" });

        if (role === "admin" && membership.role !== "owner")
            return res.status(403).json({ message: "Only owners can invite admins" });

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser && await Membership.findOne({
            user: existingUser._id,
            organization: organizationId
        }))
            return res.status(409).json({ message: "User is already a member" });

        const pending = await Invitation.findOne({
            email: normalizedEmail,
            organization: organizationId,
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (pending)
            return res.status(409).json({ message: "Invitation already pending" });

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await Invitation.create({
            email: normalizedEmail,
            organization: organizationId,
            role,
            invitedBy: req.user._id,
            tokenHash,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            status: "pending"
        });

        await logActivity({
            organization: organizationId,
            actor: req.user._id,
            action: "member_invited",
            details: `Invitation sent to ${normalizedEmail}`,
            metadata: { email: normalizedEmail, role }
        });

        // Notify registered users
        if (existingUser) {
            await sendNotification({
                recipient: existingUser._id,
                sender: req.user._id,
                organization: organizationId,
                type: "invitation",
                message: `You have been invited to join ${organization.name}`
            }).catch(console.error);
        }

        return res.status(201).json({
            success: true,
            message: "Invitation created successfully",
            invitation: {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role,
                organization: organization.name,
                status: invitation.status,
                expiresAt: invitation.expiresAt
            },
            ...(process.env.NODE_ENV === "development" && { invitationToken: token })
        });
    } catch (error) {
        console.error("Send Invitation Error:", error);
        return res.status(error.code === 11000 ? 409 : 500).json({
            message: error.code === 11000 ? "Invitation already exists" : "Failed to create invitation"
        });
    }
};

// ACCEPT INVITATION
export const acceptInvitation = async (req, res) => {
    let session;

    try {
        const { token } = req.body;

        if (!token || typeof token !== "string")
            return res.status(400).json({ message: "Invitation token required" });

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await Invitation.findOne({
            tokenHash,
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (!invitation)
            return res.status(400).json({ message: "Invalid or expired invitation" });

        if (invitation.email !== req.user.email.trim().toLowerCase())
            return res.status(403).json({ message: "Invitation belongs to another email" });

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const current = await Invitation.findOne({
                _id: invitation._id,
                status: "pending",
                expiresAt: { $gt: new Date() }
            }).session(session);

            if (!current) throw new Error("INVITATION_UNAVAILABLE");

            const existing = await Membership.findOne({
                user: req.user._id,
                organization: current.organization
            }).session(session);

            if (existing) throw new Error("ALREADY_MEMBER");

            await Membership.create([{
                user: req.user._id,
                organization: current.organization,
                role: current.role,
                status: "active",
                invitedBy: current.invitedBy
            }], { session });

            current.status = "accepted";
            await current.save({ session });
        });

        return res.json({
            success: true,
            message: "Invitation accepted",
            organizationId: invitation.organization,
            role: invitation.role
        });
    } catch (error) {
        console.error("Accept Invitation Error:", error);

        if (error.message === "ALREADY_MEMBER" || error.code === 11000)
            return res.status(409).json({ message: "Already a member" });

        if (error.message === "INVITATION_UNAVAILABLE")
            return res.status(400).json({ message: "Invitation unavailable" });

        return res.status(500).json({ message: "Failed to accept invitation" });
    } finally {
        if (session) await session.endSession();
    }
};

// REJECT INVITATION
export const rejectInvitation = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== "string")
            return res.status(400).json({ message: "Invitation token required" });

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await Invitation.findOne({
            tokenHash,
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (!invitation)
            return res.status(400).json({ message: "Invalid or expired invitation" });

        if (invitation.email !== req.user.email.trim().toLowerCase())
            return res.status(403).json({ message: "Invitation belongs to another email" });

        const rejected = await Invitation.findOneAndUpdate(
            { _id: invitation._id, status: "pending", expiresAt: { $gt: new Date() } },
            { status: "rejected" },
            { new: true }
        );

        if (!rejected)
            return res.status(400).json({ message: "Invitation unavailable" });

        return res.json({ success: true, message: "Invitation rejected" });
    } catch (error) {
        console.error("Reject Invitation Error:", error);
        return res.status(500).json({ message: "Failed to reject invitation" });
    }
};

// GET PENDING INVITATIONS
export const getPendingInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.find({
            email: req.user.email.trim().toLowerCase(),
            status: "pending",
            expiresAt: { $gt: new Date() }
        })
            .populate("organization", "name slug")
            .populate("invitedBy", "name email")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            count: invitations.length,
            invitations
        });
    } catch (error) {
        console.error("Get Pending Invitations Error:", error);
        return res.status(500).json({ message: "Failed to fetch invitations" });
    }
};
