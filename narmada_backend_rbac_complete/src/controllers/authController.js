const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Company = require("../models/Company");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

const createToken = (user, companyId = null) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      companyId: companyId || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

const sanitizeUser = (user) => {
  const response = user.toObject ? user.toObject() : { ...user };
  delete response.password;
  return response;
};

// ==========================================
// LOGIN
// ==========================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).populate("companyId", "name code status city state");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    if (user.role !== "super_admin" && !user.companyId) {
      return res.status(403).json({
        success: false,
        message: "User is not assigned to a company",
      });
    }

    if (user.role !== "super_admin" && user.companyId.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Assigned company is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const tokenCompanyId =
      user.role === "super_admin" ? null : user.companyId._id;
    const token = createToken(user, tokenCompanyId);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ==========================================
// CURRENT USER
// ==========================================
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password")
      .populate("companyId", "name code status city state gstNumber");

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User account is not available",
      });
    }

    let selectedCompany = null;

    if (req.user.companyId) {
      selectedCompany = await Company.findOne({
        _id: req.user.companyId,
        status: "active",
      }).select("name code status city state gstNumber");
    }

    return res.status(200).json({
      success: true,
      message: "Authenticated user",
      user: sanitizeUser(user),
      context: {
        companyId: req.user.companyId,
        selectedCompany,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch authenticated user",
    });
  }
};

// ==========================================
// SELECT COMPANY FOR SUPER ADMIN
// ==========================================
const selectCompany = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only super admin can select a company context",
      });
    }

    const { companyId } = req.body || {};

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid companyId is required",
      });
    }

    const company = await Company.findOne({
      _id: companyId,
      status: "active",
    }).select("name code status city state gstNumber");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Active company not found",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user || user.status !== "active" || user.role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "Super admin account is not available",
      });
    }

    const token = createToken(user, company._id);

    return res.status(200).json({
      success: true,
      message: "Company selected successfully",
      token,
      company,
    });
  } catch (error) {
    console.error("Select company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to select company",
    });
  }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Current and new password are required",
        });
    }
    const user = await User.findById(req.user.userId);
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid current password" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
};

// ==========================================
// UPDATE PROFILE
// ==========================================
const updateProfile = async (req, res) => {
  try {
    const { name, phone, profileImage } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    
    let previousProfileImage = user.profileImage;
    if (req.file) {
      user.profileImage = await saveUploadedFile(req.file, "users");
    } else if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    if (req.file && previousProfileImage && previousProfileImage !== user.profileImage) {
      await deleteUploadedFile(previousProfileImage);
    }

    await user.save();
    return res
      .status(200)
      .json({
        success: true,
        message: "Profile updated successfully",
        user: sanitizeUser(user),
      });
  } catch (error) {
    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    // In a real app, generate token and send email
    // For now, we will just return success so UI can show message
    const resetToken = require("crypto").randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    // Simulate sending email...
    return res
      .status(200)
      .json({
        success: true,
        message:
          "Password reset link sent to your email (simulated). Reset Token: " +
          resetToken,
      });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to process forgot password" });
  }
};

module.exports = {
  login,
  getCurrentUser,
  selectCompany,
  changePassword,
  updateProfile,
  forgotPassword,
};
