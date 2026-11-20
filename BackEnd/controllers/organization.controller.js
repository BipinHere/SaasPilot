
import mongoose from "mongoose";
import Organization from "../models/organization.model.js";
import Membership from "../models/membership.model.js";
import Invitation from "../models/invitation.model.js";
import { sendNotification } from "../services/notification.service.js";

// CREATE ORGANIZATION
export const createOrganization = async (req, res) => {
    let session;

    try {
        const { name, description } = req.body;

        if (typeof name !== "string" || !name.trim())
            return res.status(400).json({ message: "Organization name required" });

        const baseSlug = name.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        if (!baseSlug)
            return res.status(400).json({ message: "Invalid organization name" });

        session = await mongoose.startSession();
        let organization;

        await session.withTransaction(async () => {
            let slug = baseSlug, count = 1;

            while (await Organization.findOne({ slug }).session(session))
                slug = `${baseSlug}-${count++}`;

            [organization] = await Organization.create([{
                name: name.trim(),
                slug,
                description: description?.trim() || "",
                createdBy: req.user._id
            }], { session });

            await Membership.create([{
                user: req.user._id,
                organization: organization._id,
                role: "owner",
                status: "active"
            }], { session });
        });

        return res.status(201).json({
            success: true,
            message: "Organization created",
            organization
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create organization" });
    } finally {
        if (session) await session.endSession();
    }
};

// GET USER ORGANIZATIONS
export const getUserOrganizations = async (req, res) => {
    try {
        const memberships = await Membership.find({
            user: req.user._id,
            status: "active"
        }).populate("organization");

        const organizations = memberships
            .filter(m => m.organization)
            .map(m => ({ ...m.organization.toObject(), role: m.role }));

        return res.json({
            success: true,
            count: organizations.length,
            organizations
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// GET ORGANIZATION MEMBERS
export const getOrganizationMembers = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid organization ID" });

        const organization = await Organization.findById(organizationId);
        if (!organization)
            return res.status(404).json({ message: "Organization not found" });

        const current = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!current)
            return res.status(403).json({ message: "You are not a member" });

        const memberships = await Membership.find({
            organization: organizationId,
            status: "active"
        }).populate("user", "name email").sort({ createdAt: 1 });

        const members = memberships.filter(m => m.user).map(m => ({
            membershipId: m._id,
            userId: m.user._id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            joinedAt: m.createdAt
        }));

        return res.json({
            success: true,
            organization: { id: organization._id, name: organization.name },
            count: members.length,
            members
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// REMOVE ORGANIZATION MEMBER
export const removeOrganizationMember = async (req, res) => {
    try {
        const { organizationId, memberId } = req.params;

        if (![organizationId, memberId].every(mongoose.isValidObjectId)) {
            return res.status(400).json({ message: "Invalid IDs" });
        }

        const current = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!current || !["owner", "admin"].includes(current.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const target = await Membership.findOne({
            _id: memberId,
            organization: organizationId,
            status: "active"
        });

        if (!target) {
            return res.status(404).json({ message: "Member not found" });
        }

        if (target.role === "owner") {
            return res.status(403).json({ message: "Owner cannot be removed" });
        }

        if (target.user.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot remove yourself" });
        }

        if (current.role === "admin" && target.role !== "member") {
            return res.status(403).json({
                message: "Admins can only remove members"
            });
        }

        const organization = await Organization.findById(organizationId);

        await Membership.deleteOne({ _id: target._id });

        await sendNotification({
            recipient: target.user,
            sender: req.user._id,
            organization: organizationId,
            type: "member_update",
            message: `You have been removed from ${organization?.name || "an organization"}`
        }).catch(console.error);

        return res.json({
            success: true,
            message: "Member removed"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to remove member"
        });
    }
};


// UPDATE MEMBER ROLE
export const updateMemberRole = async (req, res) => {
    try {
        const { organizationId, memberId } = req.params;
        const { role } = req.body;

        if (![organizationId, memberId].every(mongoose.isValidObjectId))
            return res.status(400).json({ message: "Invalid IDs" });

        if (!["admin", "project_manager", "member"].includes(role))
            return res.status(400).json({ message: "Invalid role" });

        const current = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!current || current.role !== "owner")
            return res.status(403).json({ message: "Only owners can change roles" });

        const target = await Membership.findOne({
            _id: memberId,
            organization: organizationId,
            status: "active"
        });

        if (!target)
            return res.status(404).json({ message: "Member not found" });

        if (target.role === "owner")
            return res.status(403).json({ message: "Owner role cannot be changed" });

        if (target.role === role)
            return res.status(400).json({ message: "Member already has this role" });

        target.role = role;
        await target.save();

        const organization = await Organization.findById(organizationId);

        await sendNotification({
            recipient: target.user,
            sender: req.user._id,
            organization: organizationId,
            type: "member_update",
            message: `Your role in ${organization?.name || "the organization"} changed to ${role}`
        }).catch(console.error);

        return res.json({
            success: true,
            message: `Role updated to ${role}`,
            membership: target
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update role" });
    }
};

// DELETE ORGANIZATION
export const deleteOrganization = async (req, res) => {
    let session;

    try {
        const { organizationId } = req.params;

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid organization ID" });

        const owner = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            role: "owner",
            status: "active"
        });

        if (!owner)
            return res.status(403).json({ message: "Only owner can delete organization" });

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            await Membership.deleteMany({ organization: organizationId }, { session });
            await Invitation.deleteMany({ organization: organizationId }, { session });
            await Organization.deleteOne({ _id: organizationId }, { session });
        });

        return res.json({ success: true, message: "Organization deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete organization" });
    } finally {
        if (session) await session.endSession();
    }
};

// TRANSFER ORGANIZATION OWNERSHIP
export const transferOrganizationOwnership = async (req, res) => {
    let session;
    let newOwnerId;

    try {
        const { organizationId } = req.params;
        ({ newOwnerId } = req.body);

        if (![organizationId, newOwnerId].every(mongoose.isValidObjectId))
            return res.status(400).json({ message: "Invalid IDs" });

        if (req.user._id.toString() === newOwnerId.toString())
            return res.status(400).json({ message: "Already the owner" });

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const current = await Membership.findOne({
                user: req.user._id,
                organization: organizationId,
                role: "owner",
                status: "active"
            }).session(session);

            if (!current) {
                const error = new Error("Only owner can transfer ownership");
                error.statusCode = 403;
                throw error;
            }

            const next = await Membership.findOne({
                user: newOwnerId,
                organization: organizationId,
                status: "active"
            }).session(session);

            if (!next) {
                const error = new Error("New owner must be an active member");
                error.statusCode = 404;
                throw error;
            }

            current.role = "admin";
            next.role = "owner";

            await current.save({ session });
            await next.save({ session });
        });

        const organization = await Organization.findById(organizationId);

        await Promise.allSettled([
            sendNotification({
                recipient: newOwnerId,
                sender: req.user._id,
                organization: organizationId,
                type: "member_update",
                message: `You are now the owner of ${organization?.name || "the organization"}`
            }),
            sendNotification({
                recipient: req.user._id,
                sender: newOwnerId,
                organization: organizationId,
                type: "member_update",
                message: `Ownership transferred. Your new role is admin`
            })
        ]);

        return res.json({
            success: true,
            message: "Ownership transferred successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            message: error.message || "Failed to transfer ownership"
        });
    } finally {
        if (session) await session.endSession();
    }
};

// GET ORGANIZATION DETAILS
export const getOrganizationDetails = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid organization ID" });

        const membership = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!membership)
            return res.status(403).json({ message: "You are not a member" });

        const organization = await Organization.findById(organizationId);

        if (!organization)
            return res.status(404).json({ message: "Organization not found" });

        return res.json({
            success: true,
            organization: {
                _id: organization._id,
                name: organization.name,
                slug: organization.slug,
                description: organization.description,
                logo: organization.logo,
                role: membership.role,
                createdAt: organization.createdAt
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// UPDATE ORGANIZATION DETAILS
export const updateOrganizationDetails = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { name, description, logo } = req.body;

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid organization ID" });

        const membership = await Membership.findOne({
            user: req.user._id,
            organization: organizationId,
            status: "active"
        });

        if (!membership || !["owner", "admin"].includes(membership.role))
            return res.status(403).json({ message: "Not authorized" });

        const organization = await Organization.findById(organizationId);

        if (!organization)
            return res.status(404).json({ message: "Organization not found" });

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim())
                return res.status(400).json({ message: "Invalid name" });
            organization.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string" || description.length > 500)
                return res.status(400).json({ message: "Description must be under 500 characters" });
            organization.description = description.trim();
        }

        if (logo !== undefined) {
            if (typeof logo !== "string")
                return res.status(400).json({ message: "Logo must be a URL string" });
            organization.logo = logo.trim();
        }

        await organization.save();

        return res.json({
            success: true,
            message: "Organization updated",
            organization
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update organization" });
    }
};
