const Company = require("../models/Company");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

// ==========================================
// CREATE COMPANY
// ==========================================

const createCompany = async (req, res) => {
  try {
    const { name, code, email, phone, address, city, state, gstNumber, panNumber } =
      req.body;

    // Required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Company name and code are required",
      });
    }

    // Check duplicate company code
    const existingCompany = await Company.findOne({
      code: code.toUpperCase(),
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "Company code already exists",
      });
    }

    let logoUrl = null;
    if (req.file) {
      logoUrl = await saveUploadedFile(req.file, "companies");
    }

    const derivedPan =
      panNumber ||
      (gstNumber && gstNumber.trim().length >= 12
        ? gstNumber.trim().slice(2, 12).toUpperCase()
        : undefined);

    const company = await Company.create({
      name,
      code,
      email,
      phone,
      address,
      city,
      state,
      gstNumber,
      panNumber: derivedPan,
      status:
        req.body.status && req.body.status.trim() && !req.body.status.toLowerCase().startsWith("select")
          ? req.body.status.trim().toLowerCase()
          : "active",
      logo: logoUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      data: company,
    });
  } catch (error) {
    console.error("Create company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create company",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL COMPANIES
// ==========================================

const getCompanies = async (req, res) => {
  try {
    const filter = {};
    // If not super_admin, constrain to user's assigned companyId
    if (req.user && req.user.role !== "super_admin") {
      filter._id = req.user.companyId;
    }

    const companies = await Company.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (error) {
    console.error("Get companies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE COMPANY
// ==========================================

const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role !== "super_admin" && String(req.user.companyId) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this company",
      });
    }

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Get company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE COMPANY
// ==========================================

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role !== "super_admin" && String(req.user.companyId) !== String(id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to edit this company",
      });
    }

    const {
      name,
      code,
      email,
      phone,
      address,
      city,
      state,
      gstNumber,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      upiId,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromName,
      smtpFromEmail,
      status,
    } = req.body;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // If code is being changed, check duplicate
    if (code && code.toUpperCase() !== company.code) {
      const existingCompany = await Company.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: "Company code already exists",
        });
      }
    }

    company.name = name ?? company.name;
    company.code = code ? code.toUpperCase() : company.code;
    company.email = email ?? company.email;
    company.phone = phone ?? company.phone;
    company.address = address ?? company.address;
    company.city = city ?? company.city;
    company.state = state ?? company.state;
    company.gstNumber = gstNumber ?? company.gstNumber;
    if (panNumber !== undefined) {
      company.panNumber = panNumber;
    } else if (gstNumber && (!company.panNumber || gstNumber !== company.gstNumber) && gstNumber.trim().length >= 12) {
      company.panNumber = gstNumber.trim().slice(2, 12).toUpperCase();
    }

    // Bank Details
    if (bankName !== undefined) company.bankName = bankName;
    if (accountNumber !== undefined) company.accountNumber = accountNumber;
    if (ifscCode !== undefined) company.ifscCode = ifscCode ? ifscCode.toUpperCase() : company.ifscCode;
    if (branchName !== undefined) company.branchName = branchName;
    if (upiId !== undefined) company.upiId = upiId;

    // SMTP Settings
    if (smtpHost !== undefined) company.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) company.smtpPort = Number(smtpPort) || 587;
    if (smtpUser !== undefined) company.smtpUser = smtpUser || null;
    if (smtpPass && smtpPass.trim()) company.smtpPass = smtpPass.trim();
    if (smtpFromName !== undefined) company.smtpFromName = smtpFromName || null;
    if (smtpFromEmail !== undefined) company.smtpFromEmail = smtpFromEmail || null;

    if (status !== undefined && req.user?.role === "super_admin") {
      company.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : company.status || "active";
    }

    const previousLogo = company.logo;
    if (req.file) {
      company.logo = await saveUploadedFile(req.file, "companies");
    }

    const updatedCompany = await company.save();

    if (req.file && previousLogo) {
      await deleteUploadedFile(previousLogo);
    }

    return res.status(200).json({
      success: true,
      message: "Company profile & configuration updated successfully",
      data: updatedCompany,
    });
  } catch (error) {
    console.error("Update company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update company",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE COMPANY
// ==========================================

const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    await Company.findByIdAndDelete(id);

    if (company.logo) {
      await deleteUploadedFile(company.logo);
    }

    return res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Delete company error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete company",
      error: error.message,
    });
  }
};

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};
