
import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Membership from "../models/membership.model.js";
import { sendNotification } from "../services/notification.service.js";

const getMembership = (organization, user) =>
    Membership.findOne({ organization, user, status: "active" });

const getProject = async (id, user) => {
    if (!mongoose.isValidObjectId(id)) return null;

    const project = await Project.findOne({ _id: id, isDeleted: false });
    if (!project || !await getMembership(project.organization, user)) return null;

    return project;
};

const getTask = id => mongoose.isValidObjectId(id)
    ? Task.findOne({ _id: id, isDeleted: false }) : null;

// Create task
export const createTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate } = req.body;
        const project = await getProject(req.params.projectId, req.user._id);

        if (!project) return res.status(404).json({ message: "Project not found or access denied" });
        if (typeof title !== "string" || !title.trim())
            return res.status(400).json({ message: "Title required" });

        const task = await Task.create({
            title: title.trim(), description, priority, dueDate,
            project: project._id,
            organization: project.organization,
            createdBy: req.user._id
        });

        res.status(201).json({ task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get project tasks
export const getTasks = async (req, res) => {
    try {
        const project = await getProject(req.params.projectId, req.user._id);
        if (!project) return res.status(404).json({ message: "Project not found or access denied" });

        const tasks = await Task.find({ project: project._id, isDeleted: false })
            .populate("assignedTo createdBy", "name email");

        res.json({ tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get task details
export const getTaskDetails = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!await getMembership(task.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        await task.populate("assignedTo createdBy", "name email");
        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update task
export const updateTask = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        if (!await getMembership(task.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        const { title, description, status, priority, dueDate, labels } = req.body;

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim())
                return res.status(400).json({ message: "Invalid title" });
            task.title = title.trim();
        }

        for (const field of ["description", "status", "priority", "dueDate", "labels"]) {
            if (req.body[field] !== undefined) task[field] = req.body[field];
        }

        await task.save();
        res.json({ message: "Task updated", task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const member = await getMembership(task.organization, req.user._id);
        if (!member || !["owner", "admin"].includes(member.role))
            return res.status(403).json({ message: "Permission denied" });

        task.isDeleted = true;
        await task.save();

        res.json({ message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Assign task
export const assignTask = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const member = await getMembership(task.organization, req.user._id);

        if (!member || !["owner", "admin", "project_manager"].includes(member.role))
            return res.status(403).json({ message: "Only admins and project managers can assign tasks" });

        const { userIds } = req.body;

        if (!Array.isArray(userIds) || !userIds.every(id => mongoose.isValidObjectId(id)))
            return res.status(400).json({ message: "Invalid user IDs" });

        const uniqueIds = [...new Set(userIds.map(String))];
        const project = await Project.findById(task.project);

        if (!project || uniqueIds.some(id =>
            !project.members.some(m => m.toString() === id)
        )) return res.status(400).json({ message: "Users must be project members" });

        task.assignedTo = uniqueIds;
        await task.save();

        await Promise.allSettled(
            uniqueIds
                .filter(id => id !== req.user._id.toString())
                .map(recipient => sendNotification({
                    recipient,
                    sender: req.user._id,
                    organization: task.organization,
                    project: task.project,
                    task: task._id,
                    type: "task_assigned",
                    message: `You have been assigned a task: ${task.title}`
                }))
        );

        res.json({ message: "Task assigned", task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
