import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";

// ✅ REGISTER USER (Student or Instructor)
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Validate role
        const validRoles = ["student", "instructor"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role. Choose 'student' or 'instructor'." });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: "User already exists with this email." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({ name, email, password: hashedPassword, role });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: { name: newUser.name, email: newUser.email, role: newUser.role },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to register" });
    }
};

// ✅ LOGIN USER
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Find user and explicitly select password
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({ success: false, message: "Incorrect email or password" });
        }

        // Ensure password exists before comparing
        if (!user.password) {
            return res.status(500).json({ success: false, message: "User password missing in database." });
        }

        // Compare passwords
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ success: false, message: "Incorrect email or password" });
        }

        // Generate JWT token & set it in cookies
        const token = generateToken(res, user);

        // ✅ Send user details in response
        return res.status(200).json({
            success: true,
            message: `Welcome back ${user.name}`,
            user: { name: user.name, email: user.email, role: user.role }, // Exclude password
            token
        });

    } catch (error) {
        console.error(error);

        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: "Failed to login" });
        }
    }
};


// ✅ LOGOUT USER
export const logout = async (_, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to logout" });
    }
};

// ✅ GET USER PROFILE
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).select("-password").populate("enrolledCourses");

        if (!user) {
            return res.status(404).json({ message: "Profile not found", success: false });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to load user" });
    }
};

// ✅ UPDATE PROFILE
export const updateProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { name } = req.body;
        const profilePhoto = req.file;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        // Delete old profile photo if it exists
        if (user.photoUrl) {
            const publicId = user.photoUrl.split("/").pop().split(".")[0];
            await deleteMediaFromCloudinary(publicId);
        }

        // Upload new profile photo
        const cloudResponse = await uploadMedia(profilePhoto.path);
        const photoUrl = cloudResponse.secure_url;

        // Update user profile
        const updatedData = { name, photoUrl };
        const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true }).select("-password");

        return res.status(200).json({
            success: true,
            user: updatedUser,
            message: "Profile updated successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};
