const dns = require("dns");

// Force Node.js to use public DNS servers
dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const mongoose = require("mongoose");

const connectMongoDB = async () => {
    try {
        console.log("======================================");
        console.log("Connecting to MongoDB Atlas...");
        console.log("======================================");

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 15000
        });

        console.log("======================================");
        console.log("MongoDB connected successfully");
        console.log("======================================");

        return true;

    } catch (error) {

        console.error("======================================");
        console.error("MongoDB connection failed");
        console.error("======================================");
        console.error(error.message);
        console.error("======================================");

        return false;
    }
};

module.exports = connectMongoDB;