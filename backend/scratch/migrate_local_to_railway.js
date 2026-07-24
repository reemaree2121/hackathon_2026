const mysql = require('mysql2/promise');

async function migrate() {
  const localConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Reesam@2121',
    database: 'colg_portal',
    port: 3306
  };

  const railwayConfig = {
    host: 'sakura.proxy.rlwy.net',
    port: 28066,
    user: 'root',
    password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  };

  console.log("Connecting to both local and Railway databases...");
  let localConn, railwayConn;
  try {
    localConn = await mysql.createConnection(localConfig);
    console.log("✅ Connected to local colg_portal!");
    
    railwayConn = await mysql.createConnection(railwayConfig);
    console.log("✅ Connected to Railway database!");

    // Disable foreign key checks on Railway to wipe and populate safely
    await railwayConn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log("Disabled foreign key checks on Railway.");

    const tables = [
      'departments',
      'domains',
      'courses',
      'users',
      'faculty',
      'timetables',
      'events',
      'event_registrations',
      'seniors',
      'campus_locations',
      'resources',
      'ai_chat_history',
      'notices',
      'books',
      'clubs'
    ];

    for (const table of tables) {
      console.log(`\nMigrating table: "${table}"...`);

      // 1. Truncate remote table
      await railwayConn.query(`TRUNCATE TABLE \`${table}\``);
      console.log(` - Truncated remote table \`${table}\``);

      // 2. Fetch local rows
      const [rows] = await localConn.query(`SELECT * FROM \`${table}\``);
      console.log(` - Fetched ${rows.length} rows from local table`);

      if (rows.length === 0) {
        console.log(` - No rows to insert for \`${table}\`.`);
        continue;
      }

      // 3. Get column names
      const columns = Object.keys(rows[0]);
      const columnList = columns.map(c => `\`${c}\``).join(', ');
      
      // 4. Batch insert query
      const insertQuery = `INSERT INTO \`${table}\` (${columnList}) VALUES ?`;

      // Insert in chunks of 200 rows
      const CHUNK_SIZE = 200;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const values = chunk.map(row => {
          return columns.map(col => {
            let val = row[col];
            if (val && typeof val === 'object' && !(val instanceof Date)) {
              val = JSON.stringify(val);
            }
            return val;
          });
        });
        await railwayConn.query(insertQuery, [values]);
      }
      console.log(` - Successfully batch inserted ${rows.length} rows into remote table \`${table}\``);
    }

    // Re-enable foreign key checks
    await railwayConn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log("\nRe-enabled foreign key checks on Railway.");
    console.log("🎉 Database migration completed successfully!");

  } catch (err) {
    console.error("❌ Migration error:", err);
    if (railwayConn) {
      try {
        await railwayConn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        console.error("Failed to re-enable foreign keys:", e);
      }
    }
  } finally {
    if (localConn) await localConn.end();
    if (railwayConn) await railwayConn.end();
  }
}

migrate();
