const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/departments — used to populate department dropdowns dynamically
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load departments' });
  }
});

// GET /api/courses?department_id=1 — used to populate course dropdowns dynamically
router.get('/courses', async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = `
      SELECT c.id, c.name, c.department_id, d.name AS department
      FROM courses c
      LEFT JOIN departments d ON c.department_id = d.id`;
    const params = [];
    if (department_id) {
      query += ' WHERE c.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY c.name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

module.exports = router;
