// Get the client
require('dotenv').config(); // 꼭 최상단에서 호출

const mysql = require('mysql2/promise');
async function dbConnection() {
    try {
        const connection  = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_DB,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DB,
        });
        console.log("DB connected successfully.");
        return connection;
    }catch(err) {
        console.log(err);
    }

}

(async () => {
    const conn = await dbConnection(); 

    try {
        const [results, fields] = await conn.query(
            'SELECT * FROM `Users` WHERE `user_name` = ?', ['bob']
        );
        console.log("Results:", results[0].use);
        console.log("Fields:", fields);
    } catch (err) {
        console.error("Query error:", err);
    } finally {
        await conn.end();
    }
})();


