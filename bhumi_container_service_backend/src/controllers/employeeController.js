const Employee = require("../models/Employee");
const { saveUploadedFile, deleteUploadedFile } = require("../utils/upload");

// =====================================================
// CREATE EMPLOYEE
// =====================================================

const createEmployee = async (req, res) => {
  try {
    const {
      employeeCode,
      name,
      phone,
      email,
      designation,
      department,
      employeeType,
      joiningDate,
      basicSalary,
      bankName,
      accountNumber,
      ifscCode,
      address,
      remarks,
    } = req.body;

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    if (
      !employeeCode ||
      !name ||
      !designation ||
      !employeeType ||
      !joiningDate ||
      basicSalary === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "employeeCode, name, designation, employeeType, joiningDate and basicSalary are required",
      });
    }

    const salary = Number(basicSalary);

    if (!Number.isFinite(salary) || salary < 0) {
      return res.status(400).json({
        success: false,
        message: "Basic salary must be a valid positive number",
      });
    }

    const existingEmployee = await Employee.findOne({
      companyId,
      employeeCode: employeeCode.toUpperCase(),
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee code already exists",
      });
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = await saveUploadedFile(req.file, "employees");
    }

    const employee = await Employee.create({
      companyId,
      employeeCode,
      name,
      phone: phone || "",
      email: email || "",
      designation,
      department: department || "",
      employeeType,
      joiningDate,
      basicSalary: salary,
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode || "",
      address: address || "",
      status: "active",
      remarks: remarks || "",
      photo: photoUrl,
    });

    // Auto-sync with Driver model if employee is a driver
    if (
      employee.employeeType === "driver" ||
      String(employee.designation || "").toLowerCase().includes("driver")
    ) {
      try {
        const Driver = require("../models/Driver");
        const existingDriver = await Driver.findOne({
          companyId: employee.companyId,
          phone: employee.phone,
        });
        if (existingDriver) {
          if (employee.photo) existingDriver.photo = employee.photo;
          existingDriver.name = employee.name;
          if (employee.address) existingDriver.address = employee.address;
          existingDriver.status = employee.status;
          await existingDriver.save();
        } else {
          await Driver.create({
            companyId: employee.companyId,
            name: employee.name,
            phone: employee.phone || "0000000000",
            address: employee.address || "",
            status: employee.status || "active",
            photo: employee.photo || null,
            licenseNumber: `DL-${employee.employeeCode || Date.now().toString().slice(-4)}`,
            licenseExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5),
          });
        }
      } catch (dErr) {
        console.error("Auto-sync employee to driver error:", dErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL EMPLOYEES
// =====================================================

const getEmployees = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const { employeeType, department, status } = req.query;

    const filter = {
      companyId,
    };

    if (employeeType) {
      filter.employeeType = employeeType;
    }

    if (department) {
      filter.department = department;
    }

    if (status) {
      filter.status = status;
    }

    const employees = await Employee.find(filter).sort({
      name: 1,
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
};

// =====================================================
// GET EMPLOYEE BY ID
// =====================================================

const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const employee = await Employee.findOne({
      _id: id,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const employee = await Employee.findOne({
      _id: id,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const {
      name,
      phone,
      email,
      designation,
      department,
      employeeType,
      joiningDate,
      basicSalary,
      bankName,
      accountNumber,
      ifscCode,
      address,
      status,
      remarks,
    } = req.body;

    if (name !== undefined) employee.name = name;

    if (phone !== undefined) employee.phone = phone;

    if (email !== undefined) employee.email = email;

    if (designation !== undefined) employee.designation = designation;

    if (department !== undefined) employee.department = department;

    if (employeeType !== undefined) employee.employeeType = employeeType;

    if (joiningDate !== undefined) employee.joiningDate = joiningDate;

    if (basicSalary !== undefined) {
      const salary = Number(basicSalary);

      if (!Number.isFinite(salary) || salary < 0) {
        return res.status(400).json({
          success: false,
          message: "Basic salary must be valid",
        });
      }

      employee.basicSalary = salary;
    }

    if (bankName !== undefined) employee.bankName = bankName;

    if (accountNumber !== undefined) employee.accountNumber = accountNumber;

    if (ifscCode !== undefined) employee.ifscCode = ifscCode;

    if (address !== undefined) employee.address = address;

    if (status !== undefined) {
      employee.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : employee.status || "active";
    }

    if (remarks !== undefined) employee.remarks = remarks;

    const previousPhoto = employee.photo;
    if (req.file) {
      employee.photo = await saveUploadedFile(req.file, "employees");
    }

    await employee.save();

    // Auto-sync with Driver model if employee is a driver
    if (
      employee.employeeType === "driver" ||
      String(employee.designation || "").toLowerCase().includes("driver")
    ) {
      try {
        const Driver = require("../models/Driver");
        const updateData = {};
        if (employee.photo) updateData.photo = employee.photo;
        if (employee.name) updateData.name = employee.name;
        if (employee.phone) updateData.phone = employee.phone;
        if (employee.address) updateData.address = employee.address;
        if (employee.status) updateData.status = employee.status;

        await Driver.findOneAndUpdate(
          { companyId: employee.companyId, phone: employee.phone },
          { $set: updateData }
        );
      } catch (dErr) {
        console.error("Auto-sync employee update to driver error:", dErr);
      }
    }

    if (req.file && previousPhoto) {
      await deleteUploadedFile(previousPhoto);
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE / DEACTIVATE EMPLOYEE
// =====================================================

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const companyId = req.user.companyId;

    const employee = await Employee.findOne({
      _id: id,
      companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.status = "inactive";

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate employee",
      error: error.message,
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
