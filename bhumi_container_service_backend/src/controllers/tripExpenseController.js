const mongoose = require("mongoose");

const TripExpense = require("../models/TripExpense");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Vendor = require("../models/Vendor");
const { getNextSequence } = require("../utils/sequenceService");

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const populateTripExpense = (query) => {
  return query
    .populate(
      "tripId",
      "tripNumber status dispatchDate tripStartDate deliveryDate",
    )
    .populate("vehicleId", "vehicleNumber vehicleType")
    .populate("driverId", "name phone licenseNumber")
    .populate("vendorId", "vendorCode vendorName vendorType")
    .populate("enteredBy", "name email");
};

// =====================================================
// CREATE TRIP EXPENSE
// =====================================================

const createTripExpense = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    const {
      expenseNumber,
      tripId,
      vehicleId,
      driverId,
      expenseDate,
      expenseType,
      amount,
      paymentMode,
      vendorId,
      vendorName,
      receiptNumber,
      referenceNumber,
      remarks,
    } = req.body;

    // -------------------------------------------------
    // Required Fields
    // -------------------------------------------------

    if (
      !tripId ||
      !vehicleId ||
      !expenseDate ||
      !expenseType ||
      amount === undefined ||
      amount === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "tripId, vehicleId, expenseDate, expenseType and amount are required",
      });
    }

    // -------------------------------------------------
    // ObjectId Validation
    // -------------------------------------------------

    if (!isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID",
      });
    }

    if (!isValidObjectId(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID",
      });
    }

    if (driverId && !isValidObjectId(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID",
      });
    }

    if (vendorId && !isValidObjectId(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    // -------------------------------------------------
    // Normalize / Auto-generate Expense Number
    // -------------------------------------------------

    let normalizedExpenseNumber = expenseNumber
      ? expenseNumber.toString().trim().toUpperCase()
      : "";

    if (!normalizedExpenseNumber) {
      normalizedExpenseNumber = await getNextSequence(companyId, "trip-expenses");
    }

    // -------------------------------------------------
    // Validate Amount
    // -------------------------------------------------

    const expenseAmount = Number(amount);

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const finalAmount = Number(expenseAmount.toFixed(2));

    // -------------------------------------------------
    // Validate Expense Date
    // -------------------------------------------------

    const date = parseDate(expenseDate);

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense date",
      });
    }

    // -------------------------------------------------
    // Validate Trip
    // -------------------------------------------------

    const trip = await Trip.findOne({
      _id: tripId,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found in this company",
      });
    }

    if (trip.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Expense cannot be added to cancelled trip",
      });
    }

    // -------------------------------------------------
    // Validate Vehicle
    // -------------------------------------------------

    if (trip.vehicleId.toString() !== vehicleId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Selected vehicle does not belong to this trip",
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in this company",
      });
    }

    // -------------------------------------------------
    // Validate Driver
    // -------------------------------------------------

    if (driverId) {
      if (!trip.driverId || trip.driverId.toString() !== driverId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Selected driver does not belong to this trip",
        });
      }

      const driver = await Driver.findOne({
        _id: driverId,
        companyId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Validate Vendor
    // -------------------------------------------------

    if (vendorId) {
      const vendor = await Vendor.findOne({
        _id: vendorId,
        companyId,
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found in this company",
        });
      }
    }

    // -------------------------------------------------
    // Duplicate Expense Number
    // -------------------------------------------------

    const existingExpense = await TripExpense.findOne({
      companyId,
      expenseNumber: normalizedExpenseNumber,
    });

    if (existingExpense) {
      return res.status(409).json({
        success: false,
        message: "Expense number already exists",
      });
    }

    // -------------------------------------------------
    // Create Expense
    // -------------------------------------------------

    const expense = await TripExpense.create({
      companyId,

      expenseNumber: normalizedExpenseNumber,

      tripId,

      vehicleId,

      driverId: driverId || null,

      expenseDate: date,

      expenseType: expenseType.toString().trim(),

      amount: finalAmount,

      paymentMode: paymentMode ? paymentMode.toString().trim() : "cash",

      vendorId: vendorId || null,

      vendorName: vendorName ? vendorName.toString().trim() : "",

      receiptNumber: receiptNumber ? receiptNumber.toString().trim() : "",

      referenceNumber: referenceNumber ? referenceNumber.toString().trim() : "",

      remarks: remarks ? remarks.toString().trim() : "",

      enteredBy,
    });

    // -------------------------------------------------
    // Populate Response
    // -------------------------------------------------

    const populatedExpense = await populateTripExpense(
      TripExpense.findOne({
        _id: expense._id,
        companyId,
      }),
    );

    return res.status(201).json({
      success: true,
      message: "Trip expense created successfully",
      data: populatedExpense,
    });
  } catch (error) {
    console.error("Create trip expense error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Expense number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create trip expense",
      error: error.message,
    });
  }
};

// =====================================================
// GET TRIP EXPENSES
// =====================================================

const getTripExpenses = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const {
      tripId,
      vehicleId,
      driverId,
      expenseType,
      status,
      fromDate,
      toDate,
    } = req.query;

    const filter = {
      companyId,
    };

    // -------------------------------------------------
    // Validate Trip Filter
    // -------------------------------------------------

    if (tripId) {
      if (!isValidObjectId(tripId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tripId",
        });
      }

      filter.tripId = tripId;
    }

    // -------------------------------------------------
    // Validate Vehicle Filter
    // -------------------------------------------------

    if (vehicleId) {
      if (!isValidObjectId(vehicleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicleId",
        });
      }

      filter.vehicleId = vehicleId;
    }

    // -------------------------------------------------
    // Validate Driver Filter
    // -------------------------------------------------

    if (driverId) {
      if (!isValidObjectId(driverId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid driverId",
        });
      }

      filter.driverId = driverId;
    }

    // -------------------------------------------------
    // Expense Type
    // -------------------------------------------------

    if (expenseType) {
      filter.expenseType = expenseType.toString().trim();
    }

    // -------------------------------------------------
    // Status
    // -------------------------------------------------

    if (status) {
      const allowedStatuses = ["active", "cancelled"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid expense status",
        });
      }

      filter.status = status;
    }

    // -------------------------------------------------
    // Date Filter
    // -------------------------------------------------

    if (fromDate || toDate) {
      filter.expenseDate = {};

      if (fromDate) {
        const startDate = parseDate(fromDate);

        if (!startDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.expenseDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = parseDate(toDate);

        if (!endDate) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        if (filter.expenseDate.$gte && endDate < filter.expenseDate.$gte) {
          return res.status(400).json({
            success: false,
            message: "toDate cannot be earlier than fromDate",
          });
        }

        filter.expenseDate.$lte = endDate;
      }
    }

    // -------------------------------------------------
    // Fetch
    // -------------------------------------------------

    const expenses = await populateTripExpense(
      TripExpense.find(filter).sort({
        expenseDate: -1,
        createdAt: -1,
      }),
    );

    // -------------------------------------------------
    // Total Active Amount
    // -------------------------------------------------

    const totalAmount = expenses.reduce((sum, item) => {
      if (item.status === "cancelled") {
        return sum;
      }

      return sum + Number(item.amount || 0);
    }, 0);

    const cancelledAmount = expenses.reduce((sum, item) => {
      if (item.status !== "cancelled") {
        return sum;
      }

      return sum + Number(item.amount || 0);
    }, 0);

    return res.status(200).json({
      success: true,
      count: expenses.length,
      totalAmount: Number(totalAmount.toFixed(2)),
      cancelledAmount: Number(cancelledAmount.toFixed(2)),
      data: expenses,
    });
  } catch (error) {
    console.error("Get trip expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip expenses",
      error: error.message,
    });
  }
};

// =====================================================
// GET EXPENSE BY ID
// =====================================================

const getTripExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await populateTripExpense(
      TripExpense.findOne({
        _id: id,
        companyId,
      }),
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Trip expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Get trip expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip expense",
      error: error.message,
    });
  }
};

// =====================================================
// CANCEL EXPENSE
// =====================================================

const cancelTripExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // -------------------------------------------------
    // Validate ID
    // -------------------------------------------------

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    // -------------------------------------------------
    // Find Expense
    // -------------------------------------------------

    const expense = await TripExpense.findOne({
      _id: id,
      companyId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Trip expense not found",
      });
    }

    // -------------------------------------------------
    // Already Cancelled
    // -------------------------------------------------

    if (expense.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Expense is already cancelled",
      });
    }

    // -------------------------------------------------
    // Check Related Trip
    // -------------------------------------------------

    const trip = await Trip.findOne({
      _id: expense.tripId,
      companyId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Related trip not found",
      });
    }

    // -------------------------------------------------
    // Cancel
    // -------------------------------------------------

    expense.status = "cancelled";

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Trip expense cancelled successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Cancel trip expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel trip expense",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createTripExpense,
  getTripExpenses,
  getTripExpenseById,
  cancelTripExpense,
};
