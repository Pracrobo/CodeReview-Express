const mysql = require("mysql2/promise");
const config = require("./db_env");

async function dbConnection() {
  try {
    const connection = await mysql.createConnection({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DB,
    });
    console.log("DB connected successfully.");
    return connection;
  } catch (err) {
    console.error("DB connection error:", err);
    throw err;
  }
}

module.exports = dbConnection;
