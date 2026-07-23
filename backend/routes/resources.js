const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/resources
router.get('/resources', async (req, res) => {
  try {
    const { subject } = req.query;
    let query = `
      SELECT r.id, r.title, r.type, r.subject, d.name AS department, r.semester,
             r.link, u.full_name AS uploaded_by_name, r.created_at
      FROM resources r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN users u ON r.uploaded_by = u.id
      WHERE 1=1`;
    const params = [];
    
    if (subject) {
      query += ' AND r.subject LIKE ?';
      params.push(`%${subject}%`);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load resources' });
  }
});

// POST /api/resources
router.post('/resources', requireAuth, async (req, res) => {
  try {
    const { title, type, subject, department_id, semester, link } = req.body;
    if (!title || !link) {
      return res.status(400).json({ error: 'Title and link are required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO resources (title, type, subject, department_id, semester, link, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, type, subject, department_id, semester, link, req.userId]
    );
    
    res.status(201).json({ message: 'Resource shared successfully', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share resource' });
  }
});

module.exports = router;
