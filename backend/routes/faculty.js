const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/faculty?department_id=1 — faculty directory, optionally filtered by department
router.get('/faculty', async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = `
      SELECT f.id, f.name, f.designation, d.name AS department,
             f.subjects_handled, f.office_room, f.email
      FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE 1=1`;
    const params = [];
    if (department_id) {
      query += ' AND f.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY f.name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load faculty' });
  }
});

module.exports = router;
