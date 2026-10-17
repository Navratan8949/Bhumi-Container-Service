const express = require("express");
const router = express.Router();
const {
  createJobCard,
  getJobCards,
  getJobCardById,
  updateJobCard,
  deleteJobCard,
} = require("../controllers/jobCardController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getJobCards,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant", "driver", "vendor"),
  getJobCardById,
);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createJobCard,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateJobCard,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin"),
  deleteJobCard,
);

module.exports = router;
