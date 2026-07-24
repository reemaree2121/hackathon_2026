const mysql = require('mysql2/promise');

const config = {
  host: 'sakura.proxy.rlwy.net',
  port: 28066,
  user: 'root',
  password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
};

async function view() {
  try {
    const conn = await mysql.createConnection(config);
    console.log("Connected to Railway database.");

    // Query 5 users from the migrated database
    const [rows] = await conn.query(
      "SELECT id, full_name, email, roll_number, password_hash FROM users LIMIT 5"
    );
    console.log("\nSample Migrated Users:");
    console.table(rows);

    await conn.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

view();
