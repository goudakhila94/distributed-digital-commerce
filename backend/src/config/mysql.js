const mysql = require("mysql2/promise");

const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "distributed_commerce",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectMySQL = async () => {
    try {
        const connection = await mysqlPool.getConnection();

        console.log("======================================");
        console.log("MySQL connected successfully");
        console.log("Database: distributed_commerce");
        console.log("======================================");

        connection.release();

        return true;
    } catch (error) {
        console.error("======================================");
        console.error("MySQL connection failed");
        console.error("======================================");
        console.error(error.message);

        return false;
    }
};

module.exports = {
    mysqlPool,
    connectMySQL
};