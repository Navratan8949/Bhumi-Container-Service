const Fuel = require("../models/Fuel");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Vendor = require("../models/Vendor");

// ======================================================
// CREATE FUEL ENTRY
// ======================================================
const createFuel = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const enteredBy = req.user.userId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const {
      vehicleId,
      driverId,
      tripId,
      vendorId,
      fuelDate,
      fuelType,
      quantity,
      ratePerLiter,
      odometerReading,
      fuelStationVendor,
      bookingId,
      receiptNumber,
      paymentMode,
      notes,
    } = req.body;

    // ==================================================
    // BASIC VALIDATION
    // ==================================================
    if (
      !vehicleId ||
      !fuelDate ||
      quantity === undefined ||
      ratePerLiter === undefined ||
      odometerReading === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle, fuel date, quantity, rate per liter and odometer reading are required",
      });
    }

    const fuelQuantity = Number(quantity);
    const fuelRate = Number(ratePerLiter);
    const currentOdometer = Number(odometerReading);

    if (fuelQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fuel quantity must be greater than 0",
      });
    }

    if (fuelRate < 0) {
      return res.status(400).json({
        success: false,
        message: "Rate per liter cannot be negative",
      });
    }

    if (currentOdometer < 0) {
      return res.status(400).json({
        success: false,
        message: "Odometer reading cannot be negative",
      });
    }

    // ==================================================
    // VEHICLE VALIDATION
    // ==================================================
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      companyId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in your company",
      });
    }

    // ==================================================
    // DRIVER
    // ==================================================
    let finalDriverId = driverId || vehicle.driverId || null;

    if (finalDriverId) {
      const driver = await Driver.findOne({
        _id: finalDriverId,
        companyId,
      });

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found in your company",
        });
      }
    }

    // ==================================================
    // ODOMETER VALIDATION
    // ==================================================
    const previousFuel = await Fuel.findOne({
      companyId,
      vehicleId,
    }).sort({
      odometerReading: -1,
      fuelDate: -1,
    });

    if (previousFuel && currentOdometer < previousFuel.odometerReading) {
      return res.status(400).json({
        success: false,
        message: `Odometer reading cannot be less than previous reading of ${previousFuel.odometerReading} KM`,
      });
    }

    // ==================================================
    // TOTAL AMOUNT
    // ==================================================
    const totalAmount = fuelQuantity * fuelRate;

    // ==================================================
    // CREATE
    // ==================================================
    const fuel = await Fuel.create({
      companyId,

      vehicleId,

      driverId: finalDriverId,
      tripId: tripId || null,
      vendorId: vendorId || null,

      fuelDate,

      fuelType: fuelType || "diesel",

      quantity: fuelQuantity,

      ratePerLiter: fuelRate,

      // Backend calculates this
      totalAmount,

      odometerReading: currentOdometer,

      fuelStationVendor: fuelStationVendor || "",

      bookingId: bookingId || null,

      receiptNumber,

      paymentMode: paymentMode || "cash",

      notes,

      enteredBy,
    });

    // ==================================================
    // POPULATED RESPONSE
    // ==================================================
    const populatedFuel = await Fuel.findById(fuel._id)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("tripId", "tripNumber fromCity toCity status")
      .populate("vendorId", "vendorCode vendorName vendorType phone")
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("enteredBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Fuel entry created successfully",
      data: populatedFuel,
    });
  } catch (error) {
    console.error("Create fuel error:", error);

    // Duplicate receipt
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Fuel receipt number already exists in your company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create fuel entry",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL FUEL ENTRIES
// ======================================================
const getFuels = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const fuels = await Fuel.find({
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("tripId", "tripNumber fromCity toCity status")
      .populate("vendorId", "vendorCode vendorName vendorType phone")
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("enteredBy", "name email role")
      .sort({
        fuelDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: fuels.length,
      data: fuels,
    });
  } catch (error) {
    console.error("Get fuels error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fuel entries",
      error: error.message,
    });
  }
};

// ======================================================
// GET SINGLE FUEL ENTRY
// ======================================================
const getFuelById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const fuel = await Fuel.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("enteredBy", "name email role");

    if (!fuel) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: fuel,
    });
  } catch (error) {
    console.error("Get fuel by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fuel entry",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE FUEL ENTRY
// ======================================================
const updateFuel = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const fuel = await Fuel.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!fuel) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    const {
      fuelDate,
      fuelType,
      quantity,
      ratePerLiter,
      odometerReading,
      fuelStationVendor,
      bookingId,
      receiptNumber,
      paymentMode,
      notes,
      driverId,
    } = req.body;

    // ==================================================
    // VEHICLE CANNOT BE CHANGED
    // ==================================================
    // Fuel entry vehicle remains same after creation.

    // ==================================================
    // DRIVER
    // ==================================================
    if (driverId !== undefined) {
      if (driverId === null) {
        fuel.driverId = null;
      } else {
        const driver = await Driver.findOne({
          _id: driverId,
          companyId,
        });

        if (!driver) {
          return res.status(404).json({
            success: false,
            message: "Driver not found",
          });
        }

        fuel.driverId = driverId;
      }
    }

    if (bookingId !== undefined) {
      fuel.bookingId = bookingId || null;
    }

    // ==================================================
    // FUEL DATE
    // ==================================================
    if (fuelDate !== undefined) {
      fuel.fuelDate = fuelDate;
    }

    // ==================================================
    // FUEL TYPE
    // ==================================================
    if (fuelType !== undefined) {
      fuel.fuelType = fuelType;
    }

    // ==================================================
    // QUANTITY
    // ==================================================
    if (quantity !== undefined) {
      const newQuantity = Number(quantity);

      if (newQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fuel quantity must be greater than 0",
        });
      }

      fuel.quantity = newQuantity;
    }

    // ==================================================
    // RATE
    // ==================================================
    if (ratePerLiter !== undefined) {
      const newRate = Number(ratePerLiter);

      if (newRate < 0) {
        return res.status(400).json({
          success: false,
          message: "Rate per liter cannot be negative",
        });
      }

      fuel.ratePerLiter = newRate;
    }

    // ==================================================
    // ODOMETER
    // ==================================================
    if (odometerReading !== undefined) {
      const newOdometer = Number(odometerReading);

      if (newOdometer < 0) {
        return res.status(400).json({
          success: false,
          message: "Odometer reading cannot be negative",
        });
      }

      const previousFuel = await Fuel.findOne({
        companyId,
        vehicleId: fuel.vehicleId,
        _id: {
          $ne: fuel._id,
        },
      }).sort({
        odometerReading: -1,
        fuelDate: -1,
      });

      if (previousFuel && newOdometer < previousFuel.odometerReading) {
        return res.status(400).json({
          success: false,
          message: `Odometer reading cannot be less than previous reading of ${previousFuel.odometerReading} KM`,
        });
      }

      fuel.odometerReading = newOdometer;
    }

    // ==================================================
    // OTHER FIELDS
    // ==================================================
    if (fuelStationVendor !== undefined) {
      fuel.fuelStationVendor = fuelStationVendor;
    }

    if (receiptNumber !== undefined) {
      fuel.receiptNumber = receiptNumber;
    }

    if (paymentMode !== undefined) {
      fuel.paymentMode = paymentMode;
    }

    if (notes !== undefined) {
      fuel.notes = notes;
    }

    // ==================================================
    // RECALCULATE TOTAL
    // ==================================================
    fuel.totalAmount = fuel.quantity * fuel.ratePerLiter;

    await fuel.save();

    const populatedFuel = await Fuel.findById(fuel._id)
      .populate("vehicleId", "vehicleNumber vehicleType ownerType")
      .populate("driverId", "name phone licenseNumber")
      .populate("bookingId", "bookingNumber lrNumber quantity unit status")
      .populate("enteredBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Fuel entry updated successfully",
      data: populatedFuel,
    });
  } catch (error) {
    console.error("Update fuel error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Fuel receipt number already exists in your company",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update fuel entry",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE FUEL ENTRY
// ======================================================
const deleteFuel = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const fuel = await Fuel.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!fuel) {
      return res.status(404).json({
        success: false,
        message: "Fuel entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fuel entry deleted successfully",
      data: fuel,
    });
  } catch (error) {
    console.error("Delete fuel error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete fuel entry",
      error: error.message,
    });
  }
};

module.exports = {
  createFuel,
  getFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
};
