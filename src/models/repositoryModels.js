const dbConnection = require("../config/db_index");

async function getUserByName(userName) {
  const conn = await dbConnection();
  try {
    const [results] = await conn.query(
      "SELECT * FROM `Users` WHERE `user_name` = ?",
      [userName]
    );
    return results[0];
  } catch (err) {
    console.error("Query error:", err);
    throw err;
  } finally {
    await conn.end();
  }
}

module.exports = {
  getUserByName,
};
