const express = require("express");

const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking,
} = require("../controllers/bookingController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// All Booking APIs require login
router.use(authMiddleware);

// CREATE
router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createBooking,
);

// GET ALL
router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getBookings,
);

// GET ONE
router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getBookingById,
);

// UPDATE
router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateBooking,
);

// CANCEL (SOFT CANCEL)
router.post(
  "/:id/cancel",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelBooking,
);
router.put(
  "/:id/cancel",
  roleMiddleware("super_admin", "admin", "manager"),
  cancelBooking,
);

// DELETE (HARD DELETE FROM DATABASE & DELETE LINKED LR)
router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteBooking,
);

module.exports = router;
