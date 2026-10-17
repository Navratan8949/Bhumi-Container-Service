const mongoose = require("mongoose");
const PreventiveSchedule = require("../models/PreventiveSchedule");

const DEFAULT_PM_RULES = [
  {
    ruleName: "Engine Oil & Oil Filter Replacement",
    serviceType: "engine_oil",
    intervalKm: 15000,
    intervalDays: 90,
    alertThresholdKm: 500,
    description: "Drain old engine oil, replace lube filter, refill 15W40 CI4+ multigrade heavy diesel oil",
  },
  {
    ruleName: "Chassis & Wheel Hub Greasing",
    serviceType: "general_service",
    intervalKm: 5000,
    intervalDays: 30,
    alertThresholdKm: 300,
    description: "Complete chassis nipple greasing, propeller shaft universal joint, kingpin and hub lubrication",
  },
  {
    ruleName: "Brake Lining, Drums & Air Tank Service",
    serviceType: "brake_service",
    intervalKm: 20000,
    intervalDays: 120,
    alertThresholdKm: 500,
    description: "Inspect front/rear brake shoes, adjust slack adjusters, drain moisture from air reservoir tanks",
  },
  {
    ruleName: "Tyre Rotation, Wheel Balancing & Alignment",
    serviceType: "tyre_work",
    intervalKm: 40000,
    intervalDays: 180,
    alertThresholdKm: 1000,
    description: "Rotate drive axle and steer tyres for even tread wear and laser beam axle alignment",
  },
  {
    ruleName: "Differential & Gearbox Transmission Oil",
    serviceType: "general_service",
    intervalKm: 50000,
    intervalDays: 240,
    alertThresholdKm: 1500,
    description: "Drain and replenish heavy gear oil (EP 90 / 85W140) in transmission gearbox and rear differential",
  },
];

const getSchedules = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    let rules = await PreventiveSchedule.find({ companyId }).sort({ intervalKm: 1 }).lean();

    // Auto seed if empty
    if (rules.length === 0) {
      const seeded = DEFAULT_PM_RULES.map((r) => ({ ...r, companyId }));
      rules = await PreventiveSchedule.insertMany(seeded);
    }

    return res.status(200).json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    console.error("Get Preventive Schedules Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createSchedule = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { ruleName, serviceType, intervalKm, intervalDays, alertThresholdKm, description, status } =
      req.body;

    if (!ruleName || !serviceType || !intervalKm) {
      return res.status(400).json({
        success: false,
        message: "ruleName, serviceType, and intervalKm are required",
      });
    }

    const schedule = await PreventiveSchedule.create({
      companyId,
      ruleName: ruleName.trim(),
      serviceType,
      intervalKm: Number(intervalKm),
      intervalDays: Number(intervalDays || 90),
      alertThresholdKm: Number(alertThresholdKm || 500),
      description: description || "",
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "Preventive maintenance rule created successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Create Preventive Schedule Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const schedule = await PreventiveSchedule.findOne({ _id: req.params.id, companyId });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Rule not found" });
    }

    const updatable = [
      "ruleName",
      "serviceType",
      "intervalKm",
      "intervalDays",
      "alertThresholdKm",
      "description",
      "status",
    ];

    updatable.forEach((f) => {
      if (req.body[f] !== undefined) schedule[f] = req.body[f];
    });

    await schedule.save();

    return res.status(200).json({
      success: true,
      message: "Preventive rule updated successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Update Preventive Schedule Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const schedule = await PreventiveSchedule.findOneAndDelete({ _id: req.params.id, companyId });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Rule not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Preventive rule deleted successfully",
    });
  } catch (error) {
    console.error("Delete Preventive Schedule Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  DEFAULT_PM_RULES,
};
