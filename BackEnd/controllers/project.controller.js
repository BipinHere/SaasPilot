
import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Membership from "../models/membership.model.js";
import { sendNotification } from "../services/notification.service.js";

// Check organization membership
const getMembership = (organization, user) =>
    Membership.findOne({ organization, user, status: "active" });

// Check project access
const getProject = (projectId) =>
    mongoose.isValidObjectId(projectId)
        ? Project.findOne({ _id: projectId, isDeleted: false })
        : null;

// Notify project members
const notifyMembers = async (project, sender, message) => {
    const recipients = project.members
        .map(id => id.toString())
        .filter(id => id !== sender.toString());

    await Promise.allSettled(
        recipients.map(recipient => sendNotification({
            recipient,
            sender,
            organization: project.organization,
            project: project._id,
            type: "project_update",
            message
        }))
    );
};

// Create project
export const createProject = async (req, res) => {
    try {
        const { name, description, organizationId, dueDate } = req.body;

        if (typeof name !== "string" || !name.trim() ||
            !mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid details" });

        const member = await getMembership(organizationId, req.user._id);
        if (!member)
            return res.status(403).json({ message: "Access denied" });

        const project = await Project.create({
            name: name.trim(),
            description,
            organization: organizationId,
            createdBy: req.user._id,
            members: [req.user._id],
            dueDate
        });

        return res.status(201).json({ message: "Project created", project });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get organization projects
export const getProjects = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.isValidObjectId(organizationId))
            return res.status(400).json({ message: "Invalid ID" });

        if (!await getMembership(organizationId, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        const projects = await Project.find({
            organization: organizationId,
            isDeleted: false
        }).populate("createdBy", "name email");

        return res.json({ projects });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get project details
export const getProjectDetails = async (req, res) => {
    try {
        const project = await getProject(req.params.projectId);

        if (!project)
            return res.status(404).json({ message: "Project not found" });

        if (!await getMembership(project.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        await project.populate(["createdBy", "members"], "name email");

        return res.json({ project });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Update project
export const updateProject = async (req, res) => {
    try {
        const project = await getProject(req.params.projectId);

        if (!project)
            return res.status(404).json({ message: "Project not found" });

        const member = await getMembership(project.organization, req.user._id);

        if (!member || !["owner", "admin"].includes(member.role))
            return res.status(403).json({ message: "Permission denied" });

        const { name, description, status, dueDate } = req.body;

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim())
                return res.status(400).json({ message: "Invalid project name" });
            project.name = name.trim();
        }

        if (description !== undefined)
            project.description = description;

        if (status !== undefined)
            project.status = status;

        if (dueDate !== undefined)
            project.dueDate = dueDate || null;

        await project.save();

        await notifyMembers(
            project,
            req.user._id,
            `Project "${project.name}" has been updated`
        );

        return res.json({ message: "Project updated", project });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete project
export const deleteProject = async (req, res) => {
    try {
        const project = await getProject(req.params.projectId);

        if (!project)
            return res.status(404).json({ message: "Project not found" });

        const member = await getMembership(project.organization, req.user._id);

        if (!member || !["owner", "admin"].includes(member.role))
            return res.status(403).json({ message: "Permission denied" });

        project.isDeleted = true;
        await project.save();

        return res.json({ message: "Project deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Add project member
export const addProjectMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.body;
        const project = await getProject(projectId);

        if (!project)
            return res.status(404).json({ message: "Project not found" });

        if (!mongoose.isValidObjectId(userId))
            return res.status(400).json({ message: "Invalid user ID" });

        const [requester, target] = await Promise.all([
            getMembership(project.organization, req.user._id),
            getMembership(project.organization, userId)
        ]);

        if (!requester || !["owner", "admin"].includes(requester.role))
            return res.status(403).json({ message: "Permission denied" });

        if (!target)
            return res.status(400).json({ message: "User not in organization" });

        if (project.members.some(id => id.toString() === userId))
            return res.status(400).json({ message: "Already a member" });

        project.members.push(userId);
        await project.save();

        await sendNotification({
            recipient: userId,
            sender: req.user._id,
            organization: project.organization,
            project: project._id,
            type: "project_update",
            message: `You have been added to project "${project.name}"`
        }).catch(console.error);

        return res.json({ message: "Member added", project });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Remove project member
export const removeProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        const project = await getProject(projectId);

        if (!project)
            return res.status(404).json({ message: "Project not found" });

        if (!mongoose.isValidObjectId(userId))
            return res.status(400).json({ message: "Invalid user ID" });

        const member = await getMembership(project.organization, req.user._id);

        if (!member || !["owner", "admin"].includes(member.role))
            return res.status(403).json({ message: "Permission denied" });

        if (project.createdBy.toString() === userId)
            return res.status(400).json({ message: "Cannot remove creator" });

        project.members = project.members.filter(
            id => id.toString() !== userId
        );

        await project.save();

        return res.json({ message: "Member removed", project });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
