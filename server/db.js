import "dotenv/config";
import mysql from "mysql2/promise";

export const database = process.env.DB_NAME || "campuscanva_db";
if (!/^[a-zA-Z0-9_]+$/.test(database))
  throw new Error("DB_NAME must contain only letters, numbers and underscores");
export const connectionOptions = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  timezone: "Z",
  dateStrings: true,
};
export const pool = mysql.createPool({
  ...connectionOptions,
  database,
  connectionLimit: 10,
});
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
export async function rows(sql, values = [], connection = pool) {
  const [result] = await connection.execute(sql, values);
  return result;
}
export async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
