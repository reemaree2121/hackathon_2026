const mysql = require('mysql2/promise');

async function checkLocal() {
  const config = {
    host: 'localhost',
    user: 'root',
    password: 'Reesam@2121',
    database: 'colg_portal',
    port: 3306
  };
  console.log("Connecting to local MySQL database...");
  try {
    const conn = await mysql.createConnection(config);
    console.log("✅ Successfully connected to local colg_portal!");

    const [tables] = await conn.query("SHOW TABLES");
    console.log("\nTables in local database:");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(tableNames);

    for (const tableName of tableNames) {
      const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      console.log(` - ${tableName}: ${countResult[0].count} rows`);
    }

    await conn.end();
  } catch (err) {
    console.error("❌ Failed to connect to local database:", err);
  }
}

checkLocal();
