const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/campus
router.get('/campus', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM campus_locations ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load campus locations' });
  }
});

module.exports = router;
