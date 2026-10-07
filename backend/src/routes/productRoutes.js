const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// ==========================================
// GET ALL PRODUCTS
// ==========================================
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products: products
        });
    } catch (error) {
        console.error("GET PRODUCTS ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });
    }
});

// ==========================================
// GET PRODUCT BY ID
// ==========================================
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error("GET PRODUCT ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product",
            error: error.message
        });
    }
});

// ==========================================
// CREATE PRODUCT
// ==========================================
router.post("/", async (req, res) => {
    try {
        console.log("======================================");
        console.log("CREATE PRODUCT REQUEST");
        console.log(req.body);
        console.log("======================================");

        const {
            name,
            description,
            category,
            price,
            sku,
            stock,
            status
        } = req.body;

        if (!name || !category || price === undefined || !sku) {
            return res.status(400).json({
                success: false,
                message: "name, category, price and sku are required"
            });
        }

        const existingProduct = await Product.findOne({ sku });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "A product with this SKU already exists"
            });
        }

        const product = new Product({
            name,
            description: description || "",
            category,
            price,
            sku,
            stock: stock || 0,
            status: status || "active"
        });

        const savedProduct = await product.save();

        console.log("PRODUCT SAVED SUCCESSFULLY");
        console.log(savedProduct);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: savedProduct
        });
    } catch (error) {
        console.error("CREATE PRODUCT ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message
        });
    }
});

// ==========================================
// UPDATE PRODUCT
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update product",
            error: error.message
        });
    }
});

// ==========================================
// DELETE PRODUCT
// ==========================================
router.delete("/:id", async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(
            req.params.id
        );

        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product",
            error: error.message
        });
    }
});

module.exports = router;