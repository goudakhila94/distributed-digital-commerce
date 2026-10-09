const express = require("express");
const { mysqlPool } = require("../config/mysql");

const router = express.Router();


/*
    GET ALL TRANSACTIONS
    GET /api/transactions
*/
router.get("/", async (req, res) => {
    try {
        const [transactions] = await mysqlPool.query(`
            SELECT
                t.*,
                c.name AS customer_name,
                c.email AS customer_email,
                o.total AS order_total
            FROM transactions t
            LEFT JOIN customers c
                ON t.customer_id = c.id
            LEFT JOIN orders o
                ON t.order_id = o.id
            ORDER BY t.id DESC
        `);

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("GET TRANSACTIONS ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
            error: error.message
        });
    }
});


/*
    GET TRANSACTION BY ID
    GET /api/transactions/:id
*/
router.get("/:id", async (req, res) => {
    try {
        const [transactions] = await mysqlPool.query(`
            SELECT
                t.*,
                c.name AS customer_name,
                c.email AS customer_email,
                o.total AS order_total
            FROM transactions t
            LEFT JOIN customers c
                ON t.customer_id = c.id
            LEFT JOIN orders o
                ON t.order_id = o.id
            WHERE t.id = ?
        `, [req.params.id]);

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        res.status(200).json({
            success: true,
            transaction: transactions[0]
        });

    } catch (error) {
        console.error("GET TRANSACTION ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch transaction",
            error: error.message
        });
    }
});


/*
    CREATE TRANSACTION
    POST /api/transactions
*/
router.post("/", async (req, res) => {
    try {
        console.log("======================================");
        console.log("CREATE TRANSACTION REQUEST");
        console.log(req.body);
        console.log("======================================");

        const {
            order_id,
            customer_id,
            amount,
            payment_method,
            status
        } = req.body;


        /*
            Required fields
        */
        if (!order_id || !customer_id || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "order_id, customer_id and amount are required"
            });
        }


        /*
            Check order
        */
        const [orders] = await mysqlPool.query(
            "SELECT id FROM orders WHERE id = ?",
            [order_id]
        );

        if (orders.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order does not exist"
            });
        }


        /*
            Check customer
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
            Create transaction
        */
        const [result] = await mysqlPool.query(`
            INSERT INTO transactions
            (
                order_id,
                customer_id,
                amount,
                payment_method,
                status
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            order_id,
            customer_id,
            Number(amount),
            payment_method || null,
            status || "pending"
        ]);


        /*
            Get created transaction
        */
        const [newTransaction] = await mysqlPool.query(`
            SELECT
                t.*,
                c.name AS customer_name,
                c.email AS customer_email,
                o.total AS order_total
            FROM transactions t
            LEFT JOIN customers c
                ON t.customer_id = c.id
            LEFT JOIN orders o
                ON t.order_id = o.id
            WHERE t.id = ?
        `, [result.insertId]);


        res.status(201).json({
            success: true,
            message: "Transaction created successfully",
            transaction: newTransaction[0]
        });

    } catch (error) {
        console.error("CREATE TRANSACTION ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create transaction",
            error: error.message
        });
    }
});


/*
    UPDATE TRANSACTION
    PUT /api/transactions/:id
*/
router.put("/:id", async (req, res) => {
    try {
        const {
            payment_method,
            status
        } = req.body;


        const [result] = await mysqlPool.query(`
            UPDATE transactions
            SET
                payment_method = COALESCE(?, payment_method),
                status = COALESCE(?, status)
            WHERE id = ?
        `, [
            payment_method || null,
            status || null,
            req.params.id
        ]);


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }


        const [updatedTransaction] = await mysqlPool.query(`
            SELECT
                t.*,
                c.name AS customer_name,
                c.email AS customer_email,
                o.total AS order_total
            FROM transactions t
            LEFT JOIN customers c
                ON t.customer_id = c.id
            LEFT JOIN orders o
                ON t.order_id = o.id
            WHERE t.id = ?
        `, [req.params.id]);


        res.status(200).json({
            success: true,
            message: "Transaction updated successfully",
            transaction: updatedTransaction[0]
        });

    } catch (error) {
        console.error("UPDATE TRANSACTION ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update transaction",
            error: error.message
        });
    }
});


/*
    DELETE TRANSACTION
    DELETE /api/transactions/:id
*/
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await mysqlPool.query(
            "DELETE FROM transactions WHERE id = ?",
            [req.params.id]
        );


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }


        res.status(200).json({
            success: true,
            message: "Transaction deleted successfully"
        });

    } catch (error) {
        console.error("DELETE TRANSACTION ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete transaction",
            error: error.message
        });
    }
});


module.exports = router;