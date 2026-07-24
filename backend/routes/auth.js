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
      fullName, rollNumber, email, password, departmentId, courseId,
      academicYear, section, batchNumber
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required' });
    }

    // Check existing email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Check existing roll_number (USN)
    if (rollNumber) {
      const [existingRoll] = await pool.query('SELECT id FROM users WHERE roll_number = ?', [rollNumber]);
      if (existingRoll.length > 0) {
        return res.status(409).json({ error: 'An account with this USN/Roll Number already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, roll_number, password_hash, department_id, course_id, academic_year, section, batch_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, rollNumber || null, passwordHash, departmentId || null, courseId || null, academicYear || null, section || null, batchNumber || null]
    );

    try {
      await awardXP(result.insertId, 'profile_complete');
    } catch (xpErr) {
      // XP is a bonus, not core to account creation — never fail registration because of it
      console.error('XP award failed during registration (non-fatal):', xpErr.message);
    }

    const jwtSecret = process.env.JWT_SECRET || '9bF4#xL2@vN8!QmP7$kR1zY6*wT3cH5eA9';
    const token = jwt.sign({ userId: result.insertId }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ token, userId: result.insertId });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // 'email' parameter can be either email or roll_number/USN
    if (!email || !password) {
      return res.status(400).json({ error: 'Email/USN and password are required' });
    }

    // Query user by email OR roll_number
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR roll_number = ?', [email, email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/USN or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email/USN or password' });
    }
    const jwtSecret = process.env.JWT_SECRET || '9bF4#xL2@vN8!QmP7$kR1zY6*wT3cH5eA9';
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
