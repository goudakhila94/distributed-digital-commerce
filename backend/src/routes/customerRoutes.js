const express = require("express");
const { mysqlPool } = require("../config/mysql");

const router = express.Router();

/*
    GET ALL CUSTOMERS
    GET /api/customers
*/
router.get("/", async (req, res) => {
    try {
        const [customers] = await mysqlPool.query(
            "SELECT * FROM customers ORDER BY id DESC"
        );

        res.status(200).json({
            success: true,
            count: customers.length,
            customers: customers
        });
    } catch (error) {
        console.error("GET CUSTOMERS ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customers",
            error: error.message
        });
    }
});


/*
    GET CUSTOMER BY ID
    GET /api/customers/:id
*/
router.get("/:id", async (req, res) => {
    try {
        const [customers] = await mysqlPool.query(
            "SELECT * FROM customers WHERE id = ?",
            [req.params.id]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.status(200).json({
            success: true,
            customer: customers[0]
        });

    } catch (error) {
        console.error("GET CUSTOMER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer",
            error: error.message
        });
    }
});


/*
    CREATE CUSTOMER
    POST /api/customers
*/
router.post("/", async (req, res) => {
    try {
        console.log("======================================");
        console.log("CREATE CUSTOMER REQUEST");
        console.log(req.body);
        console.log("======================================");

        const {
            name,
            email,
            phone,
            address
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "name and email are required"
            });
        }

        const [existingCustomers] = await mysqlPool.query(
            "SELECT id FROM customers WHERE email = ?",
            [email]
        );

        if (existingCustomers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Customer with this email already exists"
            });
        }

        const [result] = await mysqlPool.query(
            `
            INSERT INTO customers
            (name, email, phone, address)
            VALUES (?, ?, ?, ?)
            `,
            [
                name,
                email,
                phone || null,
                address || null
            ]
        );

        const [newCustomer] = await mysqlPool.query(
            "SELECT * FROM customers WHERE id = ?",
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            customer: newCustomer[0]
        });

    } catch (error) {
        console.error("CREATE CUSTOMER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create customer",
            error: error.message
        });
    }
});


/*
    UPDATE CUSTOMER
    PUT /api/customers/:id
*/
router.put("/:id", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address
        } = req.body;

        const [result] = await mysqlPool.query(
            `
            UPDATE customers
            SET
                name = ?,
                email = ?,
                phone = ?,
                address = ?
            WHERE id = ?
            `,
            [
                name,
                email,
                phone || null,
                address || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const [updatedCustomer] = await mysqlPool.query(
            "SELECT * FROM customers WHERE id = ?",
            [req.params.id]
        );

        res.status(200).json({
            success: true,
            message: "Customer updated successfully",
            customer: updatedCustomer[0]
        });

    } catch (error) {
        console.error("UPDATE CUSTOMER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update customer",
            error: error.message
        });
    }
});


/*
    DELETE CUSTOMER
    DELETE /api/customers/:id
*/
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await mysqlPool.query(
            "DELETE FROM customers WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {
        console.error("DELETE CUSTOMER ERROR:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete customer",
            error: error.message
        });
    }
});


module.exports = router;