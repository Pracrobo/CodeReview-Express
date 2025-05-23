import mysql from "mysql2/promise";
import config from "./db_env.js";

function getConnectionPool() {
  try {
    const connection_pool = mysql.createPool({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DB,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log("DB connected successfully.");
    return connection_pool;
  } catch (err) {
    console.error("DB connection error:", err);
    throw err;
  }
}

export default getConnectionPool;
