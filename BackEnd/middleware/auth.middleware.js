import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authMiddleware = async (req,res,next)=>{
    try{
        const token = req.cookies.token;

        if(!token){
            return res.status(401).json({
                message : "Unauthorized, No token provided"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user
        const user = await User.findById(decoded.id);
        if(!user){
            return res.status(401).json({
                message : "Unauthorized, User not found"
            })
        }

        req.user = user;
        
        next();
    } catch (error) {
        return res.status(401).json({
            message : "Unauthorized, Invalid token"
        });
    }
}