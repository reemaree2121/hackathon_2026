const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'sakura.proxy.rlwy.net',
  port: 28066,
  user: 'root',
  password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
  database: 'railway',
  multipleStatements: true,
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  let conn;
  try {
    console.log('Connecting to Railway MySQL...');
    conn = await mysql.createConnection(config);
    console.log('✅ Connected to Railway!');

    // Read schema and replace db name references
    console.log('\nRunning schema.sql...');
    let schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    // Remove CREATE DATABASE and USE statements - Railway already has the db
    schema = schema
      .replace(/CREATE DATABASE.*?;\n?/gi, '')
      .replace(/USE\s+\w+;\n?/gi, '');
    await conn.query(schema);
    console.log('✅ Schema created!');

    // Run seed
    console.log('\nRunning seed.sql...');
    let seed = fs.readFileSync(path.join(__dirname, 'db', 'seed.sql'), 'utf8');
    seed = seed
      .replace(/CREATE DATABASE.*?;\n?/gi, '')
      .replace(/USE\s+\w+;\n?/gi, '');
    await conn.query(seed);
    console.log('✅ Seed data inserted!');

    // Run mentor matching migration
    console.log('\nRunning mentor_matching.sql...');
    let mentor = fs.readFileSync(path.join(__dirname, 'migrations', 'mentor_matching.sql'), 'utf8');
    mentor = mentor
      .replace(/CREATE DATABASE.*?;\n?/gi, '')
      .replace(/USE\s+\w+;\n?/gi, '');
    await conn.query(mentor);
    console.log('✅ Mentor matching tables created!');

    // Check tables created
    const [tables] = await conn.query('SHOW TABLES');
    console.log('\n📋 Tables in Railway DB:');
    tables.forEach(t => console.log(' -', Object.values(t)[0]));

    console.log('\n🎉 All done! Railway database is fully set up.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.sql) console.error('SQL:', err.sql.substring(0, 300));
  } finally {
    if (conn) await conn.end();
  }
}

runMigration();
