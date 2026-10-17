const Product = require("../models/Product");

// CREATE
const createProduct = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const { name, code, unit, description, status } = req.body;

    if (!name || !code || !unit) {
      return res.status(400).json({
        success: false,
        message: "Name, code and unit are required",
      });
    }

    const existingProduct = await Product.findOne({
      companyId,
      code: code.trim().toUpperCase(),
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product code already exists",
      });
    }

    const product = await Product.create({
      companyId,
      name,
      code,
      unit,
      description,
      status:
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : "active",
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// GET ALL
const getProducts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company is required",
      });
    }

    const products = await Product.find({
      companyId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// GET ONE
const getProductById = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const product = await Product.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// UPDATE
const updateProduct = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const product = await Product.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const { name, code, unit, description, status } = req.body;

    if (code && code.trim().toUpperCase() !== product.code) {
      const duplicate = await Product.findOne({
        companyId,
        code: code.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another product with this code already exists",
        });
      }
    }

    if (name !== undefined) product.name = name;
    if (code !== undefined) product.code = code;
    if (unit !== undefined) product.unit = unit;
    if (description !== undefined) product.description = description;
    if (status !== undefined) {
      product.status =
        status && status.trim() && !status.toLowerCase().startsWith("select")
          ? status.trim().toLowerCase()
          : product.status || "active";
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// DELETE
const deleteProduct = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      companyId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
