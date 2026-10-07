const express = require("express");
const { mysqlPool } = require("../config/mysql");

const router = express.Router();

/*
    GET ALL ORDERS
    GET /api/orders
*/
router.get("/", async (req, res) => {
    try {
        const [orders] = await mysqlPool.query(`
            SELECT
                o.*,
                c.name AS customer_name,
                c.email AS customer_email
            FROM orders o
            LEFT JOIN customers c
                ON o.customer_id = c.id
            ORDER BY o.id DESC
        `);

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET ORDERS ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});


/*
    GET ORDER BY ID
    GET /api/orders/:id
*/
router.get("/:id", async (req, res) => {
    try {
        const [orders] = await mysqlPool.query(`
            SELECT
                o.*,
                c.name AS customer_name,
                c.email AS customer_email
            FROM orders o
            LEFT JOIN customers c
                ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            order: orders[0]
        });

    } catch (error) {
        console.error("GET ORDER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: error.message
        });
    }
});


/*
    CREATE ORDER
    POST /api/orders
*/
router.post("/", async (req, res) => {
    try {
        console.log("======================================");
        console.log("CREATE ORDER REQUEST");
        console.log(req.body);
        console.log("======================================");

        const {
            customer_id,
            subtotal,
            tax,
            shipping,
            total,
            payment_status,
            order_status
        } = req.body;


        /*
            Validate customer
        */
        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "customer_id is required"
            });
        }


        /*
            Validate subtotal
        */
        if (subtotal === undefined) {
            return res.status(400).json({
                success: false,
                message: "subtotal is required"
            });
        }


        /*
            Check customer exists
        */
        const [customers] = await mysqlPool.query(
            "SELECT id FROM customers WHERE id = ?",
            [customer_id]
        );

        if (customers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Customer does not exist"
            });
        }


        /*
            Calculate values
        */
        const subtotalValue = Number(subtotal) || 0;
        const taxValue = Number(tax) || 0;
        const shippingValue = Number(shipping) || 0;

        const totalValue =
            total !== undefined
                ? Number(total)
                : subtotalValue + taxValue + shippingValue;


        /*
            Create order
        */
        const [result] = await mysqlPool.query(`
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
        `, [
            customer_id,
            subtotalValue,
            taxValue,
            shippingValue,
            totalValue,
            payment_status || "pending",
            order_status || "pending"
        ]);


        /*
            Get newly created order
        */
        const [newOrder] = await mysqlPool.query(
            `
            SELECT
                o.*,
                c.name AS customer_name,
                c.email AS customer_email
            FROM orders o
            LEFT JOIN customers c
                ON o.customer_id = c.id
            WHERE o.id = ?
            `,
            [result.insertId]
        );


        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order: newOrder[0]
        });

    } catch (error) {
        console.error("CREATE ORDER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: error.message
        });
    }
});


/*
    UPDATE ORDER
    PUT /api/orders/:id
*/
router.put("/:id", async (req, res) => {
    try {
        const {
            payment_status,
            order_status
        } = req.body;


        const [result] = await mysqlPool.query(`
            UPDATE orders
            SET
                payment_status = COALESCE(?, payment_status),
                order_status = COALESCE(?, order_status)
            WHERE id = ?
        `, [
            payment_status || null,
            order_status || null,
            req.params.id
        ]);


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }


        const [updatedOrder] = await mysqlPool.query(
            `
            SELECT
                o.*,
                c.name AS customer_name,
                c.email AS customer_email
            FROM orders o
            LEFT JOIN customers c
                ON o.customer_id = c.id
            WHERE o.id = ?
            `,
            [req.params.id]
        );


        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order: updatedOrder[0]
        });

    } catch (error) {
        console.error("UPDATE ORDER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update order",
            error: error.message
        });
    }
});


/*
    DELETE ORDER
    DELETE /api/orders/:id
*/
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await mysqlPool.query(
            "DELETE FROM orders WHERE id = ?",
            [req.params.id]
        );


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }


        res.status(200).json({
            success: true,
            message: "Order deleted successfully"
        });

    } catch (error) {
        console.error("DELETE ORDER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete order",
            error: error.message
        });
    }
});


module.exports = router;