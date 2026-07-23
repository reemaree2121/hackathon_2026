const pool = require('./config/db');

async function updateEmails() {
  const emails = [
    'reemasherin66@gmail.com',
    'crybaby2653@gmail.com',
    'reemasherin53@gmail.com',
    'halltvmarsa@gmail.com'
  ];

  try {
    const [rows] = await pool.query('SELECT id, name FROM seniors ORDER BY id ASC LIMIT 4');
    
    if (rows.length < 4) {
      console.log('Not enough seniors in the database.');
      process.exit(1);
    }

    for (let i = 0; i < 4; i++) {
      const id = rows[i].id;
      const email = emails[i];
      await pool.query('UPDATE seniors SET contact_email = ? WHERE id = ?', [email, id]);
      console.log(`Updated senior ${rows[i].name} with email ${email}`);
    }

    console.log('Success!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

updateEmails();
