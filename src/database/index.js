import mysql from "mysql2/promise";
import config from "./config.js";

let conn;

const connection_pool = mysql.createPool({
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD,
  database: config.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 3000,
});

// 연결 확인 함수
export async function testConnection() {
  try {
    conn = await connection_pool.getConnection();
    console.log("DB connected successfully.");
  } catch (err) {
    console.error("DB connection error:", err.code, err.message);
  }finally {
    if (conn) conn.release();
  }
}

export default connection_pool;
testConnection();
