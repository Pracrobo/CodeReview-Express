import mysql from "mysql2/promise";
import config from "./db_env.js";

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

// 연결 확인 함수
export async function testConnection() {
  try {
    const conn = await connection_pool.getConnection();
    console.log("DB connected successfully.");
    conn.release();
  } catch (err) {
    console.error("DB connection error:", err);
    throw err;
  }
}

export default connection_pool;
testConnection();
