
import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";
import Membership from "../models/membership.model.js";
import { sendNotification } from "../services/notification.service.js";

const getTask = id => mongoose.isValidObjectId(id)
    ? Task.findOne({ _id: id, isDeleted: false }) : null;

const getMembership = (organization, user) =>
    Membership.findOne({ organization, user, status: "active" });

// Add comment
export const addComment = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);
        const { content } = req.body;

        if (!task)
            return res.status(404).json({ message: "Task not found" });

        if (!await getMembership(task.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        if (typeof content !== "string" || !content.trim())
            return res.status(400).json({ message: "Comment required" });

        const comment = await Comment.create({
            task: task._id,
            project: task.project,
            organization: task.organization,
            author: req.user._id,
            content: content.trim()
        });

        // Notify assigned users except the comment author
        const recipients = (task.assignedTo || [])
            .map(id => id.toString())
            .filter(id => id !== req.user._id.toString());

        await Promise.allSettled(
            recipients.map(recipient => sendNotification({
                recipient,
                sender: req.user._id,
                organization: task.organization,
                project: task.project,
                task: task._id,
                type: "comment",
                message: `New comment on your task: ${task.title}`
            }))
        );

        return res.status(201).json({ comment });
    } catch (error) {
        console.error("Add Comment Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// Get comments
export const getComments = async (req, res) => {
    try {
        const task = await getTask(req.params.taskId);

        if (!task)
            return res.status(404).json({ message: "Task not found" });

        if (!await getMembership(task.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        const comments = await Comment.find({ task: task._id })
            .populate("author", "name email")
            .sort({ createdAt: -1 });

        return res.json({ comments });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Update comment
export const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;

        if (!mongoose.isValidObjectId(commentId))
            return res.status(400).json({ message: "Invalid ID" });

        const comment = await Comment.findById(commentId);

        if (!comment)
            return res.status(404).json({ message: "Comment not found" });

        if (comment.author.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Only author can edit" });

        if (!await getMembership(comment.organization, req.user._id))
            return res.status(403).json({ message: "Access denied" });

        if (typeof content !== "string" || !content.trim())
            return res.status(400).json({ message: "Comment required" });

        comment.content = content.trim();
        comment.edited = true;

        await comment.save();

        return res.json({ comment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete comment
export const deleteComment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.commentId))
            return res.status(400).json({ message: "Invalid ID" });

        const comment = await Comment.findById(req.params.commentId);

        if (!comment)
            return res.status(404).json({ message: "Comment not found" });

        const member = await getMembership(comment.organization, req.user._id);

        if (!member)
            return res.status(403).json({ message: "Access denied" });

        const author = comment.author.toString() === req.user._id.toString();

        if (!author && !["owner", "admin"].includes(member.role))
            return res.status(403).json({ message: "Permission denied" });

        await comment.deleteOne();

        return res.json({ message: "Comment deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
