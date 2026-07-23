const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/timetable?departmentId=1&academicYear=1st&section=A
// If no query params given, uses the logged-in student's own profile.
router.get('/timetable', requireAuth, async (req, res) => {
  try {
    let { departmentId, academicYear, section } = req.query;

    if (!departmentId || !academicYear || !section) {
      const [userRows] = await pool.query(
        'SELECT department_id, academic_year, section FROM users WHERE id = ?',
        [req.userId]
      );
      if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
      departmentId = departmentId || userRows[0].department_id;
      academicYear = academicYear || userRows[0].academic_year;
      section = section || userRows[0].section;
    }

    const [rows] = await pool.query(
      `SELECT day_of_week, start_time, end_time, subject, faculty, classroom, is_lab
       FROM timetables
       WHERE department_id = ? AND academic_year = ? AND section = ?
       ORDER BY FIELD(day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time ASC`,
      [departmentId, academicYear, section]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load timetable' });
  }
});

module.exports = router;
