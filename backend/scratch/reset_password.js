const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
  host: 'sakura.proxy.rlwy.net',
  port: 28066,
  user: 'root',
  password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
};

async function reset() {
  try {
    const conn = await mysql.createConnection(config);
    console.log("Connected to Railway MySQL.");

    const targetEmail = 'reesam@gmail.com';
    const newPassword = 'Fresher@123';
    const testRoll = '25CSE001';
    
    console.log(`Hashing new password: "${newPassword}"...`);
    const hash = await bcrypt.hash(newPassword, 10);

    console.log(`Updating user ${targetEmail} in the database...`);
    const [result] = await conn.query(
      "UPDATE users SET password_hash = ?, roll_number = ? WHERE email = ?",
      [hash, testRoll, targetEmail]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Successfully updated ${targetEmail}!`);
      console.log(`Email: ${targetEmail}`);
      console.log(`USN / Roll Number: ${testRoll}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.error(`❌ User ${targetEmail} not found in the database.`);
    }

    await conn.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

reset();
