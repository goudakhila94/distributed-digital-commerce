const express = require("express");
const { getPool } = require("../config/mysql");
const { requireAuth, allowRoles } = require("../middleware/auth");

const router = express.Router();

/*
====================================================
GET ALL ORDERS
Shows customer name and customer email
====================================================
*/

router.get("/", requireAuth, allowRoles("admin", "staff"), async (req, res) => {
  try {
    const pool = getPool();

    const [orders] = await pool.query(`
      SELECT
        o.id,
        o.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        o.subtotal,
        o.tax,
        o.shipping,
        o.total,
        o.payment_status,
        o.order_status,
        o.created_at
      FROM orders o
      LEFT JOIN customers c
        ON c.id = o.customer_id
      ORDER BY o.created_at DESC
    `);

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/*
====================================================
CREATE ORDER
Customer + subtotal + tax + shipping
are entered from the website
====================================================
*/

router.post("/", requireAuth, allowRoles("admin", "staff"), async (req, res) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {

    const {
      customerId,
      subtotal,
      tax,
      shipping,
      paymentStatus = "pending",
      orderStatus = "pending",
      paymentMethod = "UPI"
    } = req.body;

    // Validate customer
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Please select a customer"
      });
    }

    // Validate customer exists
    const [customerRows] = await connection.query(
      `
      SELECT id, name, email
      FROM customers
      WHERE id = ?
      `,
      [customerId]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Selected customer does not exist"
      });
    }

    const customer = customerRows[0];

    const cleanSubtotal = Number(subtotal || 0);
    const cleanTax = Number(tax || 0);
    const cleanShipping = Number(shipping || 0);

    const total =
      cleanSubtotal +
      cleanTax +
      cleanShipping;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order total must be greater than zero"
      });
    }

    const allowedPaymentStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded"
    ];

    const allowedOrderStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    ];

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status"
      });
    }

    if (!allowedOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
      });
    }

    await connection.beginTransaction();

    /*
    ------------------------------------------------
    INSERT ORDER
    ------------------------------------------------
    */

    const [orderResult] = await connection.query(
      `
      INSERT INTO orders
      (
        customer_id,
        subtotal,
        tax,
        shipping,
        total,
        payment_status,
        order_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customerId,
        cleanSubtotal,
        cleanTax,
        cleanShipping,
        total,
        paymentStatus,
        orderStatus
      ]
    );

    /*
    ------------------------------------------------
    AUTOMATIC TRANSACTION
    ------------------------------------------------
    */

    let transactionStatus = "pending";

    if (paymentStatus === "paid") {
      transactionStatus = "successful";
    }

    if (paymentStatus === "failed") {
      transactionStatus = "failed";
    }

    if (paymentStatus === "refunded") {
      transactionStatus = "refunded";
    }

    await connection.query(
      `
      INSERT INTO transactions
      (
        order_id,
        customer_id,
        amount,
        payment_method,
        status
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        orderResult.insertId,
        customerId,
        total,
        paymentMethod || "UPI",
        transactionStatus
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        id: orderResult.insertId,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        subtotal: cleanSubtotal,
        tax: cleanTax,
        shipping: cleanShipping,
        total,
        payment_status: paymentStatus,
        order_status: orderStatus
      }
    });

  } catch (error) {

    await connection.rollback();

    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {
    connection.release();
  }
});


/*
====================================================
UPDATE ORDER STATUS
====================================================
*/

router.patch(
  "/:id/status",
  requireAuth,
  allowRoles("admin", "staff"),
  async (req, res) => {

    try {

      const allowed = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ];

      const { status } = req.body;

      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status"
        });
      }

      const pool = getPool();

      const [result] = await pool.query(
        `
        UPDATE orders
        SET order_status = ?
        WHERE id = ?
        `,
        [status, req.params.id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }

      res.json({
        success: true,
        message: "Order status updated successfully"
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
);

module.exports = router;