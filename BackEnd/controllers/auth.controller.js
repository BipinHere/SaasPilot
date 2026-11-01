import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req,res)=>{
    try{
        const {name,email,password} = req.body;
        if(!name || !email|| !password){
            return res.status(400).json({
                message : "please fill all the fields"
            });
        }

        if(password.length < 8){
            return res.status(400).json({
                message : "password must be atleast 8 characters"
            });
        }

        const existingUser = await User.findOne({
            email : email.toLowerCase().trim()
        });

        if(existingUser){
            return res.status(400).json({
                message : "User already exists"
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password,12);

        // creating user
        const user = await User.create({
            name,
            email : email.toLowerCase().trim(),
            password : hashedPassword
        });

        // generate token
        const token = jwt.sign(
            { id : user._id},
            process.env.JWT_SECRET,
            {expiresIn : "7d"}
        );

        // Set HTTP-only cookie
        res.cookie("token",token,{
            httpOnly : true,
            secure : process.env.NODE_ENV === "production",
            sameSite : "lax",
            maxAge : 7*24*60*60*1000
        });

        return res.status(201).json({
            message : "User registered successfully ",
            user : {
                id : user._id,
                name : user.name,
                email : user.email
            }
        });
    }catch(error){
        console.error("Error in registration : ", error.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const login = async (req,res)=>{
    try{
        const {email,password}= req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

        if(!user){
            return res.status(400).json({
                message : "invalid email or password"
            });
        }

        // compare password
        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.status(400).json({
                message: "invalid email or password"
            });
        }

        // generate token
        const token = jwt.sign(
            { id : user._id},
            process.env.JWT_SECRET,
            { expiresIn : "7d"}
        );

        // set cookie
        res.cookie("token",token,{
            httpOnly : true,
            secure : process.env.NODE_ENV === "production",
            sameSite : "lax",
            maxAge : 7*24*60*60*1000
        });

        return res.status(200).json({
            message : "Login successful",
            user :{
                id : user._id,
                name : user.name,
                email : user.email
            }
        });
    }catch(error){
        console.error("Error in Login : ", error.message);

        return res.status(500).json({
            message : "Internal server error"
        });
    }
};

export const getCurrentUser = async(req,res)=>{
    return res.status(200).json({
        message : "current user fetched successfully",
        user: {
            id : req.user._id,
            name: req.user.name,
            email : req.user.email,
        }
    });
};

export const Logout = async(req,res)=>{
    res.clearCookie("token",{
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
        sameSite : "lax"
    });
    return res.status(200).json({
        message : "Logout successful"
    });
}