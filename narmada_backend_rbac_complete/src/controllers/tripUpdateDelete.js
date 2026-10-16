const { isValidObjectId } = require("mongoose");
const Trip = require("../models/Trip");

const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findOne({ _id: id, companyId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const updatableFields = [
      "tripNumber", "bookingId", "lrBiltyId", "vehicleId", "driverId",
      "dispatchDate", "fromCityId", "toCityId", "startingOdometer", "remarks"
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    });

    await trip.save();

    return res.status(200).json({ success: true, message: "Trip updated successfully", data: trip });
  } catch (error) {
    console.error("Update trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to update trip", error: error.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid trip ID" });
    }

    const trip = await Trip.findOneAndDelete({ _id: id, companyId });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    return res.status(200).json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Delete trip error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete trip", error: error.message });
  }
};

module.exports = { updateTrip, deleteTrip };
