const mongoose = require("mongoose");
const DriverTripSettlement = require("../models/DriverTripSettlement");
const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const TripExpense = require("../models/TripExpense");
const { getNextSequence } = require("../utils/sequenceService");

const calculateTotals = (body) => {
  const advance = Number(body.advanceGiven || 0);
  const diesel = Number(body.dieselExpense || 0);
  const toll = Number(body.tollExpense || 0);
  const hammali = Number(body.loadingHammali || 0);
  const kanta = Number(body.weighbridgeKanta || 0);
  const police = Number(body.policeRTOExpense || 0);
  const other = Number(body.otherRoadExpense || 0);

  const bataDays = Number(body.bataDays || 1);
  const perDayBataRate = Number(body.perDayBataRate || 500);
  const totalDriverBata = Number((bataDays * perDayBataRate).toFixed(2));

  const totalDriverExpenditure = Number(
    (diesel + toll + hammali + kanta + police + other + totalDriverBata).toFixed(2)
  );

  const netPayableToDriver = Number((totalDriverExpenditure - advance).toFixed(2));

  return {
    advanceGiven: advance,
    dieselExpense: diesel,
    tollExpense: toll,
    loadingHammali: hammali,
    weighbridgeKanta: kanta,
    policeRTOExpense: police,
    otherRoadExpense: other,
    bataDays,
    perDayBataRate,
    totalDriverBata,
    totalDriverExpenditure,
    netPayableToDriver,
  };
};

const createDriverSettlement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { tripId, driverId, vehicleId, settlementDate, settlementStatus, paymentMode, remarks } =
      req.body;

    if (!tripId) {
      return res.status(400).json({ success: false, message: "Trip is required" });
    }

    const trip = await Trip.findOne({ _id: tripId, companyId })
      .populate("driverId", "name phone")
      .populate("vehicleId", "vehicleNumber vehicleType");

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const assignedDriverId = driverId || trip.driverId?._id;
    const assignedVehicleId = vehicleId || trip.vehicleId?._id;

    if (!assignedDriverId || !assignedVehicleId) {
      return res.status(400).json({
        success: false,
        message: "Driver and Vehicle must be assigned to the trip",
      });
    }

    // Auto-calculate voucher number
    let voucherNumber = req.body.voucherNumber;
    if (!voucherNumber) {
      try {
        voucherNumber = await getNextSequence(companyId, "driver_trip_settlement");
      } catch (e) {
        voucherNumber = `VCH-${Date.now().toString().slice(-6)}`;
      }
    }

    const calculated = calculateTotals(req.body);

    const settlement = await DriverTripSettlement.create({
      companyId,
      voucherNumber,
      tripId,
      driverId: assignedDriverId,
      vehicleId: assignedVehicleId,
      settlementDate: settlementDate || new Date(),
      ...calculated,
      settlementStatus: settlementStatus || "draft",
      paymentMode: paymentMode || "cash",
      remarks: remarks || "",
      settledBy: req.user.userId,
    });

    const populated = await DriverTripSettlement.findById(settlement._id)
      .populate("driverId", "name phone licenseNumber")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("tripId", "tripNumber dispatchDate startingOdometer endingOdometer");

    return res.status(201).json({
      success: true,
      message: "Driver trip settlement voucher created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create Driver Settlement Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDriverSettlements = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { tripId, driverId, settlementStatus } = req.query;

    const filter = { companyId };
    if (tripId) filter.tripId = tripId;
    if (driverId) filter.driverId = driverId;
    if (settlementStatus) filter.settlementStatus = settlementStatus;

    const settlements = await DriverTripSettlement.find(filter)
      .populate("driverId", "name phone licenseNumber")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("tripId", "tripNumber dispatchDate startingOdometer endingOdometer")
      .sort({ settlementDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: settlements.length,
      data: settlements,
    });
  } catch (error) {
    console.error("Get Driver Settlements Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDriverSettlementById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settlement = await DriverTripSettlement.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("driverId", "name phone licenseNumber")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("tripId", "tripNumber dispatchDate startingOdometer endingOdometer")
      .lean();

    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement voucher not found" });
    }

    return res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    console.error("Get Driver Settlement By Id Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateDriverSettlement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settlement = await DriverTripSettlement.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement voucher not found" });
    }

    const calculated = calculateTotals({ ...settlement.toObject(), ...req.body });
    Object.assign(settlement, calculated);

    if (req.body.settlementStatus) settlement.settlementStatus = req.body.settlementStatus;
    if (req.body.paymentMode) settlement.paymentMode = req.body.paymentMode;
    if (req.body.remarks !== undefined) settlement.remarks = req.body.remarks;
    if (req.body.settlementDate) settlement.settlementDate = req.body.settlementDate;

    await settlement.save();

    const populated = await DriverTripSettlement.findById(settlement._id)
      .populate("driverId", "name phone licenseNumber")
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("tripId", "tripNumber dispatchDate");

    return res.status(200).json({
      success: true,
      message: "Driver settlement voucher updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update Driver Settlement Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDriverSettlement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settlement = await DriverTripSettlement.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!settlement) {
      return res.status(404).json({ success: false, message: "Settlement voucher not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Driver settlement voucher deleted successfully",
    });
  } catch (error) {
    console.error("Delete Driver Settlement Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDriverSettlement,
  getDriverSettlements,
  getDriverSettlementById,
  updateDriverSettlement,
  deleteDriverSettlement,
};
