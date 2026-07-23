const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const { awardXP } = require('../db/xp');

const router = express.Router();

// GET /api/events
router.get('/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, poster_url, event_date, start_time, end_time, venue,
              organizing_club, eligibility, prerequisites, registration_deadline,
              total_seats, registered_count, difficulty,
              (total_seats - registered_count) AS seats_remaining
       FROM events ORDER BY event_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// GET /api/events/:id
router.get('/events/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, poster_url, event_date, start_time, end_time, venue,
              organizing_club, eligibility, prerequisites, registration_deadline,
              total_seats, registered_count, difficulty,
              (total_seats - registered_count) AS seats_remaining
       FROM events WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// GET /api/events/:id/clash-check — timetable clash detector
router.get('/events/:id/clash-check', requireAuth, async (req, res) => {
  try {
    const [eventRows] = await pool.query(
      'SELECT event_date, start_time, end_time FROM events WHERE id = ?',
      [req.params.id]
    );
    if (eventRows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventRows[0];

    const [userRows] = await pool.query(
      'SELECT department_id, academic_year, section FROM users WHERE id = ?',
      [req.userId]
    );
    const user = userRows[0];
    const dayOfWeek = new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long' });

    const [clashes] = await pool.query(
      `SELECT subject, start_time, end_time FROM timetables
       WHERE department_id = ? AND academic_year = ? AND section = ? AND day_of_week = ?
       AND start_time < ? AND end_time > ?`,
      [user.department_id, user.academic_year, user.section, dayOfWeek, event.end_time, event.start_time]
    );

    res.json({ hasClash: clashes.length > 0, clashes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check clash' });
  }
});

// POST /api/events/:id/register — transaction-safe seat decrement
router.post('/events/:id/register', requireAuth, async (req, res) => {
  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();

    const [eventRows] = await connection.query(
      'SELECT total_seats, registered_count FROM events WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventRows[0];
    if (event.registered_count >= event.total_seats) {
      await connection.rollback();
      return res.status(400).json({ error: 'Event is full' });
    }

    const [existing] = await connection.query(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Already registered for this event' });
    }

    await connection.query(
      'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
      [req.params.id, req.userId]
    );
    await connection.query(
      'UPDATE events SET registered_count = registered_count + 1 WHERE id = ?',
      [req.params.id]
    );

    await connection.commit();
    committed = true;

    res.json({ success: true, seatsRemaining: event.total_seats - event.registered_count - 1 });
  } catch (err) {
    if (!committed) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message);
      }
    }
    console.error('Event registration error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Registration failed' });
    }
  } finally {
    connection.release();
  }

  // XP is a bonus, awarded only after the registration transaction has safely committed.
  // Isolated in its own try/catch so a failure here can never roll back a registration
  // that already succeeded, or change the response already sent to the client.
  if (committed) {
    try {
      await awardXP(req.userId, 'event_register');
    } catch (xpErr) {
      console.error('XP award failed after event registration (non-fatal):', xpErr.message);
    }
  }
});

// POST /api/events — Create a new event (auth required)
router.post('/events', requireAuth, async (req, res) => {
  try {
    const { name, description, event_date, start_time, end_time, venue,
            organizing_club, eligibility, prerequisites, registration_deadline,
            total_seats, difficulty } = req.body;
    if (!name || !event_date || !start_time || !end_time || !venue) {
      return res.status(400).json({ error: 'Name, date, time, and venue are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO events (name, description, event_date, start_time, end_time, venue,
        organizing_club, eligibility, prerequisites, registration_deadline, total_seats, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description||'', event_date, start_time, end_time, venue,
       organizing_club||'', eligibility||'All years', prerequisites||'None',
       registration_deadline||event_date, total_seats||50, difficulty||'Beginner']
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id — Update an event
router.put('/events/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, event_date, start_time, end_time, venue,
            organizing_club, eligibility, prerequisites, registration_deadline,
            total_seats, difficulty } = req.body;
            
    await pool.query(
      `UPDATE events 
       SET name=?, description=?, event_date=?, start_time=?, end_time=?, venue=?,
           organizing_club=?, eligibility=?, prerequisites=?, registration_deadline=?, total_seats=?, difficulty=?
       WHERE id=?`,
      [name, description||'', event_date, start_time, end_time, venue,
       organizing_club||'', eligibility||'All years', prerequisites||'None',
       registration_deadline||event_date, total_seats||50, difficulty||'Beginner', req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id — Delete an event  
router.delete('/events/:id', requireAuth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM event_registrations WHERE event_id = ?', [req.params.id]);
    const [result] = await connection.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    await connection.commit();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  } finally {
    connection.release();
  }
});

module.exports = router;
