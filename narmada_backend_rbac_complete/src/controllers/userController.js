const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

// =====================================================
// CREATE USER
// =====================================================
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      companyId,
      status,
      profileImage,
    } = req.body;

    // ---------------------------------------------
    // Basic validation
    // ---------------------------------------------
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    // ---------------------------------------------
    // Super Admin rules
    // ---------------------------------------------
    if (req.user.role === "super_admin") {
      if (role === "super_admin" && companyId) {
        return res.status(400).json({
          success: false,
          message: "Super admin cannot belong to a company",
        });
      }

      if (role !== "super_admin" && !companyId) {
        return res.status(400).json({
          success: false,
          message: "companyId is required for company users",
        });
      }
    }

    // ---------------------------------------------
    // Company Admin rules
    // ---------------------------------------------
    if (req.user.role === "admin") {
      // Admin can create users only inside own company
      if (!req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: "Admin is not assigned to any company",
        });
      }

      // Admin cannot create super admin
      if (role === "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot create super admin",
        });
      }

      // Admin cannot create another admin
      if (role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot create another admin",
        });
      }
    }

    // ---------------------------------------------
    // Final companyId
    // ---------------------------------------------
    let finalCompanyId = null;

    if (req.user.role === "super_admin") {
      if (role !== "super_admin") {
        finalCompanyId = companyId;
      }
    } else {
      // Never trust companyId sent by Admin
      finalCompanyId = req.user.companyId;
    }

    // ---------------------------------------------
    // Check company
    // ---------------------------------------------
    if (role !== "super_admin") {
      const company = await Company.findById(finalCompanyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      if (company.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Company is inactive",
        });
      }
    }

    // ---------------------------------------------
    // Duplicate email
    // ---------------------------------------------
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // ---------------------------------------------
    // Hash password
    // ---------------------------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    // ---------------------------------------------
    // Save uploaded profile image
    // ---------------------------------------------
    let uploadedProfileImage = null;

    if (req.file) {
      uploadedProfileImage = await saveUploadedFile(req.file, "users");
    } else if (profileImage) {
      uploadedProfileImage = profileImage;
    }

    // ---------------------------------------------
    // Create user
    // ---------------------------------------------
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      password: hashedPassword,
      role,
      companyId: finalCompanyId,
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
      profileImage: uploadedProfileImage || null,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL USERS
// =====================================================
const getUsers = async (req, res) => {
  try {
    const query = {};

    // Filter by companyId
    if (req.user.role !== "super_admin") {
      query.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      if (req.query.companyId === "platform" || req.query.companyId === "null" || req.query.companyId === "none") {
        query.companyId = null;
      } else if (req.query.companyId !== "all") {
        query.companyId = req.query.companyId;
      }
    }

    const users = await User.find(query)
      .select("-password")
      .populate("companyId", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// =====================================================
// GET USER BY ID
// =====================================================
const getUserById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
    };

    // Admin can access only own company users
    if (req.user.role !== "super_admin") {
      query.companyId = req.user.companyId;
    }

    const user = await User.findOne(query)
      .select("-password")
      .populate("companyId", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE USER
// =====================================================
const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      companyId,
      status,
      profileImage,
    } = req.body;

    const query = {
      _id: req.params.id,
    };

    // Admin can update only own company users
    if (req.user.role !== "super_admin") {
      query.companyId = req.user.companyId;
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ---------------------------------------------
    // Admin restrictions
    // ---------------------------------------------
    if (req.user.role === "admin") {
      if (role === "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot assign super admin role",
        });
      }

      if (role === "admin" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot assign admin role",
        });
      }

      // Admin cannot move user to another company
      if (companyId && companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You cannot move user to another company",
        });
      }
    }

    // ---------------------------------------------
    // Email duplicate check
    // ---------------------------------------------
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      user.email = email.toLowerCase().trim();
    }

    // ---------------------------------------------
    // Update basic fields
    // ---------------------------------------------
    const previousProfileImage = user.profileImage;

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) {
      user.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : user.status || "active";
    }

    let newProfileImage = null;

    if (req.file) {
      newProfileImage = await saveUploadedFile(req.file, "users");
      user.profileImage = newProfileImage;
    } else if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    // ---------------------------------------------
    // Role
    // ---------------------------------------------
    if (role !== undefined) {
      user.role = role;
    }

    // ---------------------------------------------
    // Company
    // ---------------------------------------------
    if (req.user.role === "super_admin" && companyId !== undefined) {
      if (user.role === "super_admin") {
        user.companyId = null;
      } else {
        const company = await Company.findById(companyId);

        if (!company) {
          return res.status(404).json({
            success: false,
            message: "Company not found",
          });
        }

        if (company.status !== "active") {
          return res.status(400).json({
            success: false,
            message: "Company is inactive",
          });
        }

        user.companyId = companyId;
      }
    }

    // ---------------------------------------------
    // Password
    // ---------------------------------------------
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // ---------------------------------------------
    // Final role/company validation
    // ---------------------------------------------
    if (user.role === "super_admin") {
      user.companyId = null;
    } else if (!user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required for non-super-admin users",
      });
    }

    await user.save();

    if (req.file && previousProfileImage && previousProfileImage !== user.profileImage) {
      await deleteUploadedFile(previousProfileImage);
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE USER
// =====================================================
const deleteUser = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
    };

    // Admin can delete only own company users
    if (req.user.role !== "super_admin") {
      query.companyId = req.user.companyId;
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ---------------------------------------------
    // Safety: cannot delete yourself
    // ---------------------------------------------
    if (user._id.toString() === req.user.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(user._id);

    if (user.profileImage) {
      await deleteUploadedFile(user.profileImage);
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
