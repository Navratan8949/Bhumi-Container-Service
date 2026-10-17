const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("super_admin", "admin", "manager"),
  createProduct,
);

router.get(
  "/",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getProducts,
);

router.get(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager", "accountant"),
  getProductById,
);

router.put(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  updateProduct,
);

router.delete(
  "/:id",
  roleMiddleware("super_admin", "admin", "manager"),
  deleteProduct,
);

module.exports = router;
