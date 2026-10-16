const express = require("express");

const {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,
} = require("../controllers/cityController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", roleMiddleware("super_admin", "admin", "manager"), createCity);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCities,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getCityById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateCity,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteCity,
);

module.exports = router;
