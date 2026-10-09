const express = require("express");
const { getPool } = require("../config/mysql");
const { requireAuth, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  allowRoles("admin", "staff"),
  async (req, res) => {

    try {

      const pool = getPool();

      const [transactions] = await pool.query(`
        SELECT
          t.id,
          t.order_id,
          t.customer_id,
          t.amount,
          t.payment_method,
          t.status,
          t.created_at,

          c.name AS customer_name,
          c.email AS customer_email,

          CONCAT('ORD-', t.order_id) AS order_reference

        FROM transactions t

        LEFT JOIN customers c
          ON c.id = t.customer_id

        ORDER BY t.created_at DESC
      `);

      res.json({
        success: true,
        count: transactions.length,
        transactions
      });

    } catch (error) {

      console.error("GET TRANSACTIONS ERROR:", error);

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;