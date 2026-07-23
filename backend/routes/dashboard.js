const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GET /api/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.academic_year, u.section, u.batch_number,
              u.avatar_url, d.name AS department, c.name AS course
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN courses c ON u.course_id = c.id
       WHERE u.id = ?`,
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// GET /api/dashboard  — bundles everything the dashboard page needs in one call
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      `SELECT u.id, u.full_name, u.department_id, u.academic_year, u.section
       FROM users u WHERE u.id = ?`,
      [req.userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    const [upcomingEvents] = await pool.query(
      `SELECT id, name, event_date, start_time, venue, total_seats, registered_count
       FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC LIMIT 5`
    );

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const [todaysClasses] = await pool.query(
      `SELECT subject, faculty, classroom, start_time, end_time, is_lab
       FROM timetables
       WHERE department_id = ? AND academic_year = ? AND section = ? AND day_of_week = ?
       ORDER BY start_time ASC`,
      [user.department_id, user.academic_year, user.section, today]
    );

    const [notices] = await pool.query(
      'SELECT id, title, body, posted_at FROM notices ORDER BY posted_at DESC LIMIT 5'
    );

    // Recommended clubs (just grab 3 random/recent ones for the dashboard)
    const [recommendedClubs] = await pool.query(
      'SELECT c.id, c.name, d.name AS domain FROM clubs c LEFT JOIN domains d ON c.domain_id = d.id ORDER BY RAND() LIMIT 3'
    );

    // AI insight — one Gemini call using this student's real data, not filler text
    let aiInsight = "You're all set for today — check your timetable and upcoming events below.";
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `You are a campus assistant. Given this student's today's classes: ${JSON.stringify(todaysClasses)} and upcoming events: ${JSON.stringify(upcomingEvents)}, write ONE short, specific, genuinely useful sentence (max 25 words) suggesting how they could use a free slot today or which event fits their schedule. Do not use generic filler like "have a great day". Be concrete with times.`;
        const result = await model.generateContent(prompt);
        aiInsight = result.response.text().trim();
      }
    } catch (aiErr) {
      console.error('AI insight generation failed, using fallback:', aiErr.message);
    }

    res.json({
      welcomeName: user.full_name,
      todaysClasses,
      upcomingEvents,
      notices,
      recommendedClubs,
      aiInsight
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
