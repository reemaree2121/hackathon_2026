-- ============================================================================
-- AI Mentor Matching Engine — Database Migration
-- Run: mysql -u root -p colg_portal < backend/migrations/mentor_matching.sql
-- ============================================================================

-- Mentorship requests between freshers and seniors
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
);

-- Mentor feedback / reviews
CREATE TABLE IF NOT EXISTS mentor_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentor_id INT NOT NULL,
  fresher_id INT NOT NULL,
  rating INT CHECK(rating BETWEEN 1 AND 5),
  feedback TEXT,
  session_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES seniors(id) ON DELETE CASCADE,
  FOREIGN KEY (fresher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI recommendation cache to avoid repeated Gemini calls
CREATE TABLE IF NOT EXISTS mentor_match_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  recommendations JSON NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user (user_id)
);

-- Add interests column to users if it doesn't exist
-- (safe to run multiple times)
ALTER TABLE users ADD COLUMN interests VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN career_goal VARCHAR(100) DEFAULT NULL;
