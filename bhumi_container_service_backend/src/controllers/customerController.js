const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const CustomerInvoice = require("../models/CustomerInvoice");
const AdvanceMemo = require("../models/AdvanceMemo");

// Helper to generate a clean Customer Code
const generateCustomerCode = async (companyId) => {
  try {
    const count = await Customer.countDocuments({ companyId });
    const codeNum = (count + 1).toString().padStart(3, "0");
    const candidate = `CUST-${codeNum}`;
    const exists = await Customer.findOne({ companyId, customerCode: candidate });
    if (!exists) return candidate;
    return `CUST-${Date.now().toString().slice(-5)}`;
  } catch {
    return `CUST-${Date.now().toString().slice(-5)}`;
  }
};

// ==========================================
// CREATE CUSTOMER / PARTY
// ==========================================
const createCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const {
      name,
      customerName,
      customerCode,
      contactPerson,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
      creditDays,
      creditLimit,
      paymentTerms,
      openingBalance,
      balanceType,
      bankName,
      accountNumber,
      ifscCode,
      status,
      notes,
    } = req.body;

    const finalName = (name || customerName || "").trim();
    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "Customer / Party Name is required",
      });
    }

    // Check duplicate name within the same company
    const existingName = await Customer.findOne({
      companyId,
      name: { $regex: new RegExp(`^${finalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: `Customer "${finalName}" already exists in your company master`,
      });
    }

    let finalCode = (customerCode || "").trim().toUpperCase();
    if (!finalCode) {
      finalCode = await generateCustomerCode(companyId);
    } else {
      const codeExists = await Customer.findOne({ companyId, customerCode: finalCode });
      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: `Customer Code "${finalCode}" is already in use`,
        });
      }
    }

    const customer = await Customer.create({
      companyId,
      customerCode: finalCode,
      name: finalName,
      customerName: finalName,
      contactPerson: contactPerson || "",
      phone: phone || "",
      alternatePhone: alternatePhone || "",
      email: email ? email.toLowerCase().trim() : "",
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      gstNumber: gstNumber ? gstNumber.toUpperCase().trim() : "",
      panNumber: panNumber ? panNumber.toUpperCase().trim() : "",
      creditDays: creditDays !== undefined && creditDays !== "" ? Number(creditDays) : 30,
      creditLimit: creditLimit ? Number(creditLimit) : 0,
      paymentTerms: paymentTerms || "credit_30",
      openingBalance: openingBalance ? Number(openingBalance) : 0,
      balanceType: balanceType || "debit",
      bankName: bankName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode ? ifscCode.toUpperCase().trim() : "",
      status: status || "active",
      notes: notes || "",
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Customer / Party added successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Customer code or name already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL CUSTOMERS (WITH RICH SEARCH & FILTERS)
// ==========================================
const getCustomers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // Auto-migrate unique parties from invoices/memos if customer count is zero
    try {
      const currentCount = await Customer.countDocuments({ companyId });
      if (currentCount === 0) {
        const invParties = await CustomerInvoice.distinct("customerName", {
          companyId,
          customerName: { $ne: "" },
        });
        const memoParties = await AdvanceMemo.distinct("partyName", {
          companyId,
          partyName: { $ne: "" },
        });
        const allUniqueNames = Array.from(new Set([...invParties, ...memoParties])).filter(Boolean);

        for (let idx = 0; idx < allUniqueNames.length; idx++) {
          const pName = allUniqueNames[idx].trim();
          if (!pName) continue;
          const code = `CUST-${(idx + 1).toString().padStart(3, "0")}`;
          // Get sample phone/city if available from invoice
          const sampleInv = await CustomerInvoice.findOne({ companyId, customerName: pName });
          await Customer.create({
            companyId,
            customerCode: code,
            name: pName,
            customerName: pName,
            phone: sampleInv?.customerPhone || "",
            address: sampleInv?.customerAddress || "",
            gstNumber: sampleInv?.customerGst || "",
            status: "active",
            creditDays: 30,
            paymentTerms: "credit_30",
          });
        }
      }
    } catch (seedErr) {
      console.warn("Auto-sync existing parties non-blocking error:", seedErr.message);
    }

    const { search, status, city, state, paymentTerms } = req.query;

    const filter = { companyId };

    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }

    if (city && city !== "all") {
      filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
    }

    if (state && state !== "all") {
      filter.state = { $regex: new RegExp(`^${state.trim()}$`, "i") };
    }

    if (paymentTerms && paymentTerms !== "all") {
      filter.paymentTerms = paymentTerms;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { customerCode: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { gstNumber: { $regex: q, $options: "i" } },
        { panNumber: { $regex: q, $options: "i" } },
      ];
    }

    const total = await Customer.countDocuments(filter);

    let query = Customer.find(filter).sort({ name: 1 });

    if (req.query.page && req.query.limit) {
      const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limitNum = Math.max(1, parseInt(req.query.limit, 10) || 25);
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);

      const customers = await query.lean();

      return res.status(200).json({
        success: true,
        count: customers.length,
        total,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum) || 1,
          limit: limitNum,
        },
        data: customers,
      });
    }

    const customers = await query.lean();

    return res.status(200).json({
      success: true,
      count: customers.length,
      total,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// ==========================================
// GET CUSTOMER BY ID (WITH OUTSTANDING & STATS)
// ==========================================
const getCustomerById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, companyId }).lean();
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Aggregate real-time invoice stats for this customer
    try {
      const invoices = await CustomerInvoice.find({
        companyId,
        $or: [{ partyId: customer._id }, { customerName: customer.name }],
      }).select("grandTotal paidAmount outstandingAmount invoiceDate paymentStatus invoiceNumber");

      const totalInvoices = invoices.length;
      let totalBilled = 0;
      let totalReceived = 0;
      let totalOutstanding = 0;

      invoices.forEach((inv) => {
        totalBilled += inv.grandTotal || 0;
        totalReceived += inv.paidAmount || 0;
        totalOutstanding += inv.outstandingAmount || 0;
      });

      customer.stats = {
        totalInvoices,
        totalBilled,
        totalReceived,
        totalOutstanding,
        recentInvoices: invoices.slice(-5).reverse(),
      };
    } catch (statsErr) {
      console.warn("Could not calculate customer stats:", statsErr.message);
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer details",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE CUSTOMER
// ==========================================
const updateCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, companyId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const {
      name,
      customerName,
      customerCode,
      contactPerson,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
      creditDays,
      creditLimit,
      paymentTerms,
      openingBalance,
      balanceType,
      bankName,
      accountNumber,
      ifscCode,
      status,
      notes,
    } = req.body;

    const finalName = (name || customerName || "").trim();
    if (finalName && finalName !== customer.name) {
      const duplicate = await Customer.findOne({
        companyId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${finalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Another customer with name "${finalName}" already exists`,
        });
      }
      customer.name = finalName;
      customer.customerName = finalName;
    }

    if (customerCode !== undefined) {
      const code = customerCode.toString().trim().toUpperCase();
      if (code && code !== customer.customerCode) {
        const codeDup = await Customer.findOne({
          companyId,
          _id: { $ne: id },
          customerCode: code,
        });
        if (codeDup) {
          return res.status(409).json({
            success: false,
            message: `Customer Code "${code}" is already used by another customer`,
          });
        }
        customer.customerCode = code;
      }
    }

    if (contactPerson !== undefined) customer.contactPerson = contactPerson;
    if (phone !== undefined) customer.phone = phone;
    if (alternatePhone !== undefined) customer.alternatePhone = alternatePhone;
    if (email !== undefined) customer.email = email ? email.toLowerCase().trim() : "";
    if (address !== undefined) customer.address = address;
    if (city !== undefined) customer.city = city;
    if (state !== undefined) customer.state = state;
    if (pincode !== undefined) customer.pincode = pincode;
    if (gstNumber !== undefined) customer.gstNumber = gstNumber ? gstNumber.toUpperCase().trim() : "";
    if (panNumber !== undefined) customer.panNumber = panNumber ? panNumber.toUpperCase().trim() : "";
    if (creditDays !== undefined && creditDays !== "") customer.creditDays = Number(creditDays);
    if (creditLimit !== undefined && creditLimit !== "") customer.creditLimit = Number(creditLimit);
    if (paymentTerms !== undefined) customer.paymentTerms = paymentTerms;
    if (openingBalance !== undefined && openingBalance !== "") customer.openingBalance = Number(openingBalance);
    if (balanceType !== undefined) customer.balanceType = balanceType;
    if (bankName !== undefined) customer.bankName = bankName;
    if (accountNumber !== undefined) customer.accountNumber = accountNumber;
    if (ifscCode !== undefined) customer.ifscCode = ifscCode ? ifscCode.toUpperCase().trim() : "";
    if (status !== undefined) customer.status = status;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE CUSTOMER
// ==========================================
const deleteCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, companyId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Safety check: Has active invoices or memos?
    const [invoiceCount, memoCount] = await Promise.all([
      CustomerInvoice.countDocuments({
        companyId,
        $or: [{ partyId: customer._id }, { customerName: customer.name }],
      }),
      AdvanceMemo.countDocuments({
        companyId,
        $or: [{ partyId: customer._id }, { partyName: customer.name }],
      }),
    ]);

    if (invoiceCount > 0 || memoCount > 0) {
      if (req.query.force !== "true") {
        return res.status(400).json({
          success: false,
          message: `Cannot delete customer "${customer.name}". Linked to ${invoiceCount} Customer Invoices and ${memoCount} Advance Memos. Set status to "inactive" instead.`,
          canDeactivate: true,
        });
      }
    }

    await Customer.deleteOne({ _id: id, companyId });

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// ==========================================
// STATS / SUMMARY
// ==========================================
const getCustomerStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }

    const [total, active, gstCount] = await Promise.all([
      Customer.countDocuments({ companyId }),
      Customer.countDocuments({ companyId, status: "active" }),
      Customer.countDocuments({ companyId, gstNumber: { $exists: true, $ne: "" } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers: total,
        activeCustomers: active,
        gstRegistered: gstCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
};
