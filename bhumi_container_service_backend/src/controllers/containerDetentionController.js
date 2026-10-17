const mongoose = require("mongoose");
const ContainerDetention = require("../models/ContainerDetention");
const { getNextSequence } = require("../utils/sequenceService");

const calculateDetentionState = (item, asOfDate = new Date()) => {
  const gateOut = new Date(item.portGateOutDate);
  const freeDays = Number(item.freeDays || 14);
  const rate = Number(item.perDayDetentionRate || 3000);

  const expiry = new Date(gateOut.getTime() + freeDays * 24 * 60 * 60 * 1000);
  expiry.setHours(23, 59, 59, 999);

  const returnDate = item.emptyReturnDate ? new Date(item.emptyReturnDate) : null;
  const compareDate = returnDate || asOfDate;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.max(0, Math.floor((compareDate - gateOut) / msPerDay));

  let daysRemaining = Math.ceil((expiry - asOfDate) / msPerDay);
  if (daysRemaining < 0) daysRemaining = 0;

  let detentionDays = 0;
  if (returnDate) {
    if (returnDate > expiry) {
      detentionDays = Math.ceil((returnDate - expiry) / msPerDay);
    }
  } else if (asOfDate > expiry) {
    detentionDays = Math.ceil((asOfDate - expiry) / msPerDay);
  }

  const detentionAmount = detentionDays * rate;

  let status = item.status;
  if (returnDate) {
    status = detentionDays > 0 ? "settled" : "returned_clean";
  } else if (detentionDays > 0) {
    status = "detention_active";
  } else if (daysRemaining <= 3) {
    status = "expiring_soon";
  } else {
    status = "within_free_time";
  }

  return {
    freeDaysExpiryDate: expiry,
    daysElapsed,
    daysRemaining,
    detentionDays,
    detentionAmount,
    status,
  };
};

const createDetention = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      containerNumber,
      customsSealNumber,
      shippingLine,
      containerSize,
      bookingId,
      lrBiltyId,
      tripId,
      vehicleId,
      portName,
      portGateOutDate,
      freeDays = 14,
      emptyReturnDate,
      emptyReturnYard,
      perDayDetentionRate = 3000,
      remarks,
    } = req.body;

    if (!containerNumber || !portGateOutDate) {
      return res.status(400).json({
        success: false,
        message: "Container Number and Port Gate-Out Date are required",
      });
    }

    let detentionNumber = req.body.detentionNumber;
    if (!detentionNumber) {
      try {
        detentionNumber = await getNextSequence(companyId, "container_detention");
      } catch (e) {
        detentionNumber = `DET-${Date.now().toString().slice(-6)}`;
      }
    }

    const state = calculateDetentionState({
      portGateOutDate,
      freeDays,
      emptyReturnDate,
      perDayDetentionRate,
    });

    const record = await ContainerDetention.create({
      companyId,
      detentionNumber,
      containerNumber: containerNumber.trim().toUpperCase(),
      customsSealNumber: (customsSealNumber || "").trim().toUpperCase(),
      shippingLine: shippingLine || "Maersk Line",
      containerSize: containerSize || "40_ft_hc",
      bookingId: bookingId || null,
      lrBiltyId: lrBiltyId || null,
      tripId: tripId || null,
      vehicleId: vehicleId || null,
      portName: portName || "Chennai Port (CITPL)",
      portGateOutDate,
      freeDays,
      freeDaysExpiryDate: state.freeDaysExpiryDate,
      emptyReturnDate: emptyReturnDate || null,
      emptyReturnYard: emptyReturnYard || "",
      perDayDetentionRate,
      daysElapsed: state.daysElapsed,
      daysRemaining: state.daysRemaining,
      detentionDays: state.detentionDays,
      detentionAmount: state.detentionAmount,
      status: state.status,
      remarks: remarks || "",
      enteredBy: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Container detention tracker initiated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Create Container Detention Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDetentions = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, shippingLine, containerNumber } = req.query;

    const filter = { companyId };
    if (status) filter.status = status;
    if (shippingLine) filter.shippingLine = new RegExp(shippingLine, "i");
    if (containerNumber) filter.containerNumber = new RegExp(containerNumber, "i");

    const records = await ContainerDetention.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("lrBiltyId", "lrNumber article")
      .populate("tripId", "tripNumber status")
      .sort({ portGateOutDate: -1, createdAt: -1 })
      .lean();

    const now = new Date();
    const updatedRecords = records.map((rec) => {
      if (rec.status !== "returned_clean" && rec.status !== "settled") {
        const state = calculateDetentionState(rec, now);
        return { ...rec, ...state };
      }
      return rec;
    });

    return res.status(200).json({
      success: true,
      count: updatedRecords.length,
      data: updatedRecords,
    });
  } catch (error) {
    console.error("Get Container Detentions Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDetentionById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const record = await ContainerDetention.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("lrBiltyId", "lrNumber article")
      .populate("tripId", "tripNumber status")
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Detention record not found" });
    }

    const state = calculateDetentionState(record);
    return res.status(200).json({
      success: true,
      data: { ...record, ...state },
    });
  } catch (error) {
    console.error("Get Detention By Id Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateDetention = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const record = await ContainerDetention.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "Detention record not found" });
    }

    const updatable = [
      "containerNumber",
      "customsSealNumber",
      "shippingLine",
      "containerSize",
      "portName",
      "portGateOutDate",
      "freeDays",
      "emptyReturnDate",
      "emptyReturnYard",
      "perDayDetentionRate",
      "status",
      "remarks",
    ];

    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        record[f] = req.body[f];
      }
    });

    const state = calculateDetentionState(record);
    record.freeDaysExpiryDate = state.freeDaysExpiryDate;
    record.daysElapsed = state.daysElapsed;
    record.daysRemaining = state.daysRemaining;
    record.detentionDays = state.detentionDays;
    record.detentionAmount = state.detentionAmount;
    if (!req.body.status) {
      record.status = state.status;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Container detention updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Update Detention Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDetention = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const record = await ContainerDetention.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "Detention record not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Container detention record deleted successfully",
    });
  } catch (error) {
    console.error("Delete Detention Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDetention,
  getDetentions,
  getDetentionById,
  updateDetention,
  deleteDetention,
  calculateDetentionState,
};
