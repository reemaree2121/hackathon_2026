const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/clubs
router.get('/clubs', async (req, res) => {
  try {
    const { domain } = req.query;
    let query = `
      SELECT c.id, c.name, c.description, d.name AS domain, c.contact_email
      FROM clubs c
      LEFT JOIN domains d ON c.domain_id = d.id`;
    const params = [];
    
    if (domain) {
      query += ' WHERE d.name = ?';
      params.push(domain);
    }
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load clubs' });
  }
});

module.exports = router;
