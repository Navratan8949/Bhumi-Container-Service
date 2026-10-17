const mongoose = require("mongoose");
const JobCard = require("../models/JobCard");
const Vehicle = require("../models/Vehicle");
const { getNextSequence } = require("../utils/sequenceService");

const createJobCard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      vehicleId,
      driverId,
      odometerReading,
      jobCardType = "routine_service",
      priority = "normal",
      inwardDate,
      mechanicName,
      workshopVendor,
      complaints,
      diagnosis,
      actionTaken,
      isHighwaySOS = false,
      breakdownLocation,
      breakdownDateTime,
      mechanicDispatchDateTime,
      mechanicArrivalDateTime,
      towingRequired = false,
      towingVendor,
      partsCost = 0,
      labourCost = 0,
      remarks,
    } = req.body;

    if (!vehicleId || odometerReading === undefined) {
      return res.status(400).json({
        success: false,
        message: "vehicleId and odometerReading are required",
      });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    // Auto update vehicle odometer if this reading is higher
    if (Number(odometerReading) > Number(vehicle.currentOdometer || 0)) {
      vehicle.currentOdometer = Number(odometerReading);
      await vehicle.save();
    }

    let jobCardNumber = req.body.jobCardNumber;
    if (!jobCardNumber) {
      try {
        jobCardNumber = await getNextSequence(companyId, "job_card");
      } catch (e) {
        jobCardNumber = `JC-${Date.now().toString().slice(-6)}`;
      }
    }

    // Downtime calculation for SOS
    let totalDowntimeHours = 0;
    if (isHighwaySOS && breakdownDateTime) {
      const bTime = new Date(breakdownDateTime);
      const aTime = mechanicArrivalDateTime ? new Date(mechanicArrivalDateTime) : new Date();
      totalDowntimeHours = Number(((aTime - bTime) / (1000 * 60 * 60)).toFixed(1));
      if (totalDowntimeHours < 0) totalDowntimeHours = 0;
    }

    const totalCost = Number(partsCost || 0) + Number(labourCost || 0);

    const jobCard = await JobCard.create({
      companyId,
      jobCardNumber,
      jobCardType,
      priority: isHighwaySOS ? "emergency_sos" : priority,
      vehicleId,
      driverId: driverId || vehicle.driverId || null,
      odometerReading: Number(odometerReading),
      inwardDate: inwardDate || new Date(),
      workflowStage: "vehicle_inward",
      mechanicName: mechanicName || "",
      workshopVendor: workshopVendor || "Bhumi In-House Workshop (Puzhal)",
      complaints: complaints || "",
      diagnosis: diagnosis || "",
      actionTaken: actionTaken || "",
      isHighwaySOS: Boolean(isHighwaySOS),
      breakdownLocation: breakdownLocation || "",
      breakdownDateTime: breakdownDateTime || null,
      mechanicDispatchDateTime: mechanicDispatchDateTime || null,
      mechanicArrivalDateTime: mechanicArrivalDateTime || null,
      totalDowntimeHours,
      towingRequired: Boolean(towingRequired),
      towingVendor: towingVendor || "",
      partsCost: Number(partsCost || 0),
      labourCost: Number(labourCost || 0),
      totalCost,
      remarks: remarks || "",
      enteredBy: req.user.userId,
    });

    const populated = await JobCard.findById(jobCard._id)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone");

    return res.status(201).json({
      success: true,
      message: "Workshop job card created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create JobCard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getJobCards = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { vehicleId, jobCardType, workflowStage, isHighwaySOS } = req.query;

    const filter = { companyId };
    if (vehicleId) filter.vehicleId = vehicleId;
    if (jobCardType) filter.jobCardType = jobCardType;
    if (workflowStage) filter.workflowStage = workflowStage;
    if (isHighwaySOS !== undefined) filter.isHighwaySOS = isHighwaySOS === "true";

    const jobCards = await JobCard.find(filter)
      .populate("vehicleId", "vehicleNumber vehicleType currentOdometer")
      .populate("driverId", "name phone licenseNumber")
      .sort({ inwardDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: jobCards.length,
      data: jobCards,
    });
  } catch (error) {
    console.error("Get JobCards Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getJobCardById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const jobCard = await JobCard.findOne({ _id: req.params.id, companyId })
      .populate("vehicleId", "vehicleNumber vehicleType currentOdometer")
      .populate("driverId", "name phone licenseNumber")
      .lean();

    if (!jobCard) {
      return res.status(404).json({ success: false, message: "Job card not found" });
    }

    return res.status(200).json({ success: true, data: jobCard });
  } catch (error) {
    console.error("Get JobCard By Id Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateJobCard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const jobCard = await JobCard.findOne({ _id: req.params.id, companyId });

    if (!jobCard) {
      return res.status(404).json({ success: false, message: "Job card not found" });
    }

    const updatable = [
      "workflowStage",
      "priority",
      "mechanicName",
      "workshopVendor",
      "complaints",
      "diagnosis",
      "actionTaken",
      "isHighwaySOS",
      "breakdownLocation",
      "breakdownDateTime",
      "mechanicDispatchDateTime",
      "mechanicArrivalDateTime",
      "totalDowntimeHours",
      "towingRequired",
      "towingVendor",
      "partsCost",
      "labourCost",
      "remarks",
    ];

    updatable.forEach((f) => {
      if (req.body[f] !== undefined) {
        jobCard[f] = req.body[f];
      }
    });

    // Auto Gate Pass generation when moving to ready_gate_pass or delivered_closed
    if (
      (jobCard.workflowStage === "ready_gate_pass" || jobCard.workflowStage === "delivered_closed") &&
      !jobCard.gatePassNumber
    ) {
      jobCard.gatePassNumber = `GP-${jobCard.jobCardNumber.replace(/^JC-?/i, "")}`;
      jobCard.gatePassIssuedAt = new Date();
    }

    // Recalculate total cost
    jobCard.totalCost = Number(jobCard.partsCost || 0) + Number(jobCard.labourCost || 0);

    await jobCard.save();

    const populated = await JobCard.findById(jobCard._id)
      .populate("vehicleId", "vehicleNumber vehicleType")
      .populate("driverId", "name phone");

    return res.status(200).json({
      success: true,
      message: "Job card updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update JobCard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteJobCard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const jobCard = await JobCard.findOneAndDelete({ _id: req.params.id, companyId });

    if (!jobCard) {
      return res.status(404).json({ success: false, message: "Job card not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job card deleted successfully",
    });
  } catch (error) {
    console.error("Delete JobCard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createJobCard,
  getJobCards,
  getJobCardById,
  updateJobCard,
  deleteJobCard,
};
