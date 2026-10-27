const mongoose = require("mongoose");
const DriverTripSettlement = require("../models/DriverTripSettlement");
const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const AdvanceMemo = require("../models/AdvanceMemo");
const { getNextSequence } = require("../utils/sequenceService");

const calculateTotals = (body) => {
  const advance = Number(body.advanceGiven ?? body.adv ?? 0);
  const diesel = Number(body.dieselExpense ?? body.diesel ?? body.disal ?? 0);
  const toll = Number(body.tollExpense ?? body.toll ?? 0);
  const urea = Number(body.ureaExpense ?? body.urea ?? 0);
  const hammali = Number(body.loadingHammali ?? 0);
  const kanta = Number(body.weighbridgeKanta ?? 0);
  const police = Number(body.policeRTOExpense ?? body.rto ?? 0);
  const other = Number(body.otherRoadExpense ?? 0);
  const extra = Number(body.extraExpense ?? body.extra ?? 0);
  const accountAdvance = Number(body.accountAdvance ?? body.ac ?? 0);

  const bataDays = Number(body.bataDays || 1);
  const perDayBataRate = Number(body.perDayBataRate || 500);
  const totalDriverBata = body.totalDriverBata !== undefined && body.totalDriverBata !== ""
    ? Number(body.totalDriverBata)
    : accountAdvance > 0
      ? accountAdvance
      : Number((bataDays * perDayBataRate).toFixed(2));

  const totalDriverExpenditure = Number(
    (diesel + toll + urea + hammali + kanta + police + other + (accountAdvance || totalDriverBata)).toFixed(2)
  );

  // In Excel: Balance = Advance - Total Expenses (Positive = driver owes cash back, Negative = company pays extra)
  const netPayableToDriver = Number((advance - totalDriverExpenditure).toFixed(2));
  const finalAmount = Number((totalDriverExpenditure + extra).toFixed(2));

  const startKm = Number(body.startKm ?? body.skm ?? 0);
  const returnKm = Number(body.returnKm ?? body.rkm ?? 0);
  const totalKm = returnKm > startKm ? returnKm - startKm : Number(body.totalKm ?? body.tkm ?? 0);
  const rs = Number(body.rs ?? 0);

  return {
    startKm,
    returnKm,
    totalKm,
    rs,
    advanceGiven: advance,
    dieselExpense: diesel,
    tollExpense: toll,
    ureaExpense: urea,
    loadingHammali: hammali,
    weighbridgeKanta: kanta,
    policeRTOExpense: police,
    otherRoadExpense: other,
    extraExpense: extra,
    accountAdvance: accountAdvance || totalDriverBata,
    finalAmount: body.finalAmount ? Number(body.finalAmount) : finalAmount,
    bataDays,
    perDayBataRate,
    totalDriverBata: accountAdvance || totalDriverBata,
    totalDriverExpenditure,
    netPayableToDriver,
    partyName: body.partyName || "",
    containerSize: body.containerSize || body.mc || "22F",
    fromLocation: body.fromLocation || "",
    toLocation: body.toLocation || "",
    driverPhone: body.driverPhone || "",
    advanceDate: body.advanceDate ? new Date(body.advanceDate) : null,
    dieselDate: body.dieselDate ? new Date(body.dieselDate) : null,
    tollDate: body.tollDate ? new Date(body.tollDate) : null,
    acDate: body.acDate ? new Date(body.acDate) : null,
    extraDate: body.extraDate ? new Date(body.extraDate) : null,
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
    podDate: body.podDate || "",
    isOk: Boolean(body.isOk || body.ok || body.settlementStatus === "paid_settled"),
  };
};

const createDriverSettlement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { tripId, driverId, vehicleId, settlementDate, settlementStatus, paymentMode, remarks } =
      req.body;

    let assignedDriverId = driverId;
    let assignedVehicleId = vehicleId;

    if (tripId) {
      const trip = await Trip.findOne({ _id: tripId, companyId })
        .populate("driverId", "name phone")
        .populate("vehicleId", "vehicleNumber vehicleType");

      if (trip) {
        if (!assignedDriverId && trip.driverId) assignedDriverId = trip.driverId._id;
        if (!assignedVehicleId && trip.vehicleId) assignedVehicleId = trip.vehicleId._id;
      }
    }

    if (!assignedDriverId || !assignedVehicleId) {
      return res.status(400).json({
        success: false,
        message: "Driver and Vehicle are required for Driver Settlement",
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
      tripId: tripId || null,
      advanceMemoId:
        req.body.advanceMemoId && mongoose.Types.ObjectId.isValid(req.body.advanceMemoId)
          ? req.body.advanceMemoId
          : null,
      driverId: assignedDriverId,
      vehicleId: assignedVehicleId,
      settlementDate: settlementDate || new Date(),
      ...calculated,
      settlementStatus: settlementStatus || "draft",
      paymentMode: paymentMode || "cash",
      remarks: remarks || "",
      settledBy: req.user.userId,
    });

    // Auto-sync Trip and Advance Memo status to settled
    if (tripId && mongoose.Types.ObjectId.isValid(tripId)) {
      await Trip.findOneAndUpdate(
        { _id: tripId, companyId },
        { $set: { status: "settled" } },
      ).catch(() => {});
      await AdvanceMemo.updateMany(
        { tripId, companyId },
        { $set: { status: "settled" } },
      ).catch(() => {});
    }
    if (
      req.body.advanceMemoId &&
      mongoose.Types.ObjectId.isValid(req.body.advanceMemoId)
    ) {
      await AdvanceMemo.findOneAndUpdate(
        { _id: req.body.advanceMemoId, companyId },
        { $set: { status: "settled" } },
      ).catch(() => {});
    }

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
