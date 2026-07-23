const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/books
router.get('/books', async (req, res) => {
  try {
    const { subject, department_id } = req.query;
    let query = `
      SELECT b.id, b.book_name, b.subject, b.semester, d.name AS department,
             b.condition, b.price, u.full_name AS owner_name, u.email AS owner_email, b.created_at
      FROM books b
      LEFT JOIN departments d ON b.department_id = d.id
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE 1=1`;
    const params = [];
    
    if (subject) {
      query += ' AND b.subject LIKE ?';
      params.push(`%${subject}%`);
    }
    if (department_id) {
      query += ' AND b.department_id = ?';
      params.push(department_id);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

// POST /api/books
router.post('/books', requireAuth, async (req, res) => {
  try {
    const { book_name, subject, semester, department_id, condition, price } = req.body;
    if (!book_name || !department_id) {
      return res.status(400).json({ error: 'Book name and department are required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO books (book_name, subject, semester, department_id, `condition`, price, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [book_name, subject, semester, department_id, condition, price, req.userId]
    );
    
    res.status(201).json({ message: 'Book listed successfully', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list book' });
  }
});

module.exports = router;
