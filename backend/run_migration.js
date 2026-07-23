const pool = require('./config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fresher_id INT NOT NULL,
        mentor_id INT NOT NULL,
        status ENUM('pending','accepted','declined','cancelled') DEFAULT 'pending',
        message TEXT,
        ai_match_score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (fresher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES seniors(id) ON DELETE CASCADE,
        UNIQUE KEY unique_pair (fresher_id, mentor_id)
      )
    `);
    console.log('✅ mentorship_requests table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentor_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mentor_id INT NOT NULL,
        fresher_id INT NOT NULL,
        rating INT,
        feedback TEXT,
        session_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mentor_id) REFERENCES seniors(id) ON DELETE CASCADE,
        FOREIGN KEY (fresher_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ mentor_feedback table created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentor_match_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        recommendations JSON NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
    `);
    console.log('✅ mentor_match_cache table created');

    // Add interests and career_goal columns to users (skip if already exist)
    try {
      await pool.query('ALTER TABLE users ADD COLUMN interests VARCHAR(255) DEFAULT NULL');
      console.log('✅ Added interests column to users');
    } catch(e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️  interests column already exists');
      else throw e;
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN career_goal VARCHAR(100) DEFAULT NULL');
      console.log('✅ Added career_goal column to users');
    } catch(e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⏭️  career_goal column already exists');
      else throw e;
    }

    console.log('\n🎉 Migration complete!');
  } catch(err) {
    console.error('Migration error:', err.message);
  }
  process.exit();
}

migrate();
