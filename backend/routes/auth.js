const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { awardXP } = require('../db/xp');

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const {
      fullName, email, password, departmentId, courseId,
      academicYear, section, batchNumber
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, department_id, course_id, academic_year, section, batch_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, passwordHash, departmentId || null, courseId || null, academicYear || null, section || null, batchNumber || null]
    );

    try {
      await awardXP(result.insertId, 'profile_complete');
    } catch (xpErr) {
      // XP is a bonus, not core to account creation — never fail registration because of it
      console.error('XP award failed during registration (non-fatal):', xpErr.message);
    }

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, userId: result.insertId });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
