const express = require("express");
const { getPool } = require("../config/mysql");
const { requireAuth, allowRoles } = require("../middleware/auth");

const router = express.Router();

// GET ALL CUSTOMERS
router.get("/", requireAuth, allowRoles("admin", "staff"), async (req, res) => {
  try {
    const pool = getPool();

    const [customers] = await pool.query(`
      SELECT
        id,
        name,
        email,
        phone,
        address,
        created_at
      FROM customers
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// CREATE CUSTOMER FROM WEBSITE
router.post("/", requireAuth, allowRoles("admin", "staff"), async (req, res) => {
  try {
    const {
      name,
      email,
      phone = "",
      address = ""
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required"
      });
    }

    const pool = getPool();

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();
    const cleanAddress = String(address || "").trim();

    // Prevent duplicate customers
    const [existing] = await pool.query(
      "SELECT id FROM customers WHERE email = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A customer with this email already exists"
      });
    }

    // SAVE CUSTOMER PERMANENTLY IN MYSQL
    const [result] = await pool.query(
      `
      INSERT INTO customers
      (name, email, phone, address)
      VALUES (?, ?, ?, ?)
      `,
      [
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanAddress
      ]
    );

    // Return the newly created customer
    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        created_at
      FROM customers
      WHERE id = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer: rows[0]
    });

  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;