const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'sakura.proxy.rlwy.net';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc';
const dbName = process.env.DB_NAME || 'railway';
const dbPort = Number(process.env.DB_PORT) || (dbHost === 'localhost' || dbHost === '127.0.0.1' ? 3306 : 28066);

const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log("✅ MySQL Connected Successfully");
    connection.release();
  })
  .catch(err => {
    console.error("❌ MySQL Connection Failed");
    console.error(`Host: ${dbHost}, User: ${dbUser}, DB: ${dbName}`);
    console.error("Full Error:", err);
  });

module.exports = pool;