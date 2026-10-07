const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectMongoDB = require("./config/db");
const { connectMySQL } = require("./config/mysql");

const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/*
    ROOT
*/
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Distributed Digital Commerce API is running",
        version: "1.0.0"
    });
});


/*
    HEALTH CHECK
*/
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        server: "running",
        databases: {
            mongodb: "connected",
            mysql: "connected"
        }
    });
});


/*
    MONGODB APIs
*/
app.use("/api/products", productRoutes);


/*
    MYSQL APIs
*/
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transactions", transactionRoutes);


/*
    TEMPORARY INVENTORY API
*/
app.get("/api/inventory", (req, res) => {
    res.json({
        success: true,
        message: "Inventory API is working",
        inventory: []
    });
});


/*
    404 HANDLER
*/
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});


/*
    ERROR HANDLER
*/
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:");
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message
    });
});


const PORT = process.env.PORT || 5000;


/*
    START SERVER
*/
const startServer = async () => {

    console.log("======================================");
    console.log("Starting Distributed Commerce Backend");
    console.log("======================================");

    const mongoConnected = await connectMongoDB();
    const mysqlConnected = await connectMySQL();

    if (!mongoConnected) {
        console.error("MongoDB connection failed.");
        process.exit(1);
    }

    if (!mysqlConnected) {
        console.error("MySQL connection failed.");
        process.exit(1);
    }

    app.listen(PORT, () => {

        console.log("======================================");
        console.log("Distributed Digital Commerce Backend");
        console.log("======================================");

        console.log(`Server running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);

        console.log("======================================");
    });
};


startServer();