const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const { awardXP } = require('../db/xp');
const { GoogleGenAI } = require('@google/genai');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// GET /seniors - Get all seniors
router.get('/', async (req, res) => {
  try {
    const [seniors] = await pool.query('SELECT * FROM seniors');
    res.json(seniors);
  } catch (error) {
    console.error('Error fetching seniors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /domains - Get all domains
router.get('/domains', async (req, res) => {
  try {
    const [domains] = await pool.query('SELECT * FROM domains');
    res.json(domains);
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/match', requireAuth, async (req, res) => {
  const count = parseInt(req.query.count, 10) || 3;
  const refresh = req.query.refresh === 'true';
  const userId = req.userId;

  try {
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    if (!refresh) {
      const [cached] = await pool.query(
        'SELECT recommendations FROM mentor_match_cache WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (cached.length > 0) {
        return res.json(typeof cached[0].recommendations === 'string' ? JSON.parse(cached[0].recommendations) : cached[0].recommendations);
      }
    }

    const [fresherRows] = await pool.query(
      'SELECT u.*, d.name AS department, c.name AS course FROM users u LEFT JOIN departments d ON u.department_id=d.id LEFT JOIN courses c ON u.course_id=c.id WHERE u.id=?',
      [userId]
    );
    const fresherProfile = fresherRows[0];
    if (!fresherProfile) return res.status(404).json({ error: 'User not found' });

    const [seniors] = await pool.query(
      'SELECT s.*, d.name AS department, dom.name AS domain FROM seniors s LEFT JOIN departments d ON s.department_id=d.id LEFT JOIN domains dom ON s.domain_id=dom.id'
    );

    const prompt = `You are an AI mentor matching engine for a college portal.

Fresher profile:
${JSON.stringify(fresherProfile)}

Available senior mentors:
${JSON.stringify(seniors)}

Analyze compatibility between the fresher and each mentor based on:
- Academic similarity (same department gets +20 points)
- Skills alignment (matching skills/interests gets +25 points)
- Domain relevance to career goal (+20 points)
- Hackathon experience (+10 points for 3+ hackathons)
- Club overlap (+10 points)
- Placement status (placed seniors get +15 points)

Return ONLY valid JSON array (no markdown, no backticks):
[
  {
    "mentor_id": <number>,
    "score": <0-100>,
    "reason": "<2-3 sentence explanation>",
    "strengths": ["<strength1>", "<strength2>", "<strength3>"]
  }
]

Sort by score descending. Return top ${count} mentors only.
Be specific in reasons — mention actual skills, departments, and clubs by name.`;

    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    let recommendations;
    try {
      let text = response.text;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recommendations = JSON.parse(text);
      if (!Array.isArray(recommendations)) throw new Error('Not an array');
    } catch(parseErr) {
      console.error('Gemini JSON parse failed:', parseErr.message, 'Raw:', response.text);
      recommendations = seniors.slice(0, count).map((s, i) => ({
        mentor_id: s.id,
        score: 80 - i * 10,
        reason: `${s.name} is a strong mentor in ${s.domain} with ${s.hackathons_won} hackathon wins.`,
        strengths: [s.skills, s.domain, s.placement_status].filter(Boolean)
      }));
    }

    await pool.query(
      'INSERT INTO mentor_match_cache (user_id, recommendations, expires_at, created_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 6 HOUR), NOW())',
      [userId, JSON.stringify(recommendations)]
    );

    return res.json(recommendations);
  } catch (error) {
    console.error('Server error matching mentors:', error);
    return res.status(500).json({ error: 'Server error matching mentors' });
  }
});

router.post('/request', requireAuth, async (req, res) => {
  const { mentor_id, message, ai_match_score } = req.body;
  const fresher_id = req.userId;

  try {
    const [seniorCheck] = await pool.query('SELECT * FROM seniors WHERE id = ?', [fresher_id]);
    if (seniorCheck.length > 0) {
      return res.status(403).json({ error: 'Seniors cannot request mentorship' });
    }

    const [existing] = await pool.query('SELECT * FROM mentorship_requests WHERE fresher_id = ? AND mentor_id = ?', [fresher_id, mentor_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Request already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO mentorship_requests (fresher_id, mentor_id, status, message, ai_match_score, created_at, updated_at) VALUES (?, ?, "pending", ?, ?, NOW(), NOW())',
      [fresher_id, mentor_id, message, ai_match_score]
    );

    await awardXP(fresher_id, 'mentorship_request');

    res.json({ id: result.insertId, fresher_id, mentor_id, status: 'pending', message, ai_match_score });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT mr.*, s.name AS mentor_name, s.skills, s.contact_email, d.name AS department, dom.name AS domain FROM mentorship_requests mr JOIN seniors s ON mr.mentor_id=s.id LEFT JOIN departments d ON s.department_id=d.id LEFT JOIN domains dom ON s.domain_id=dom.id WHERE mr.fresher_id=? ORDER BY mr.created_at DESC',
      [req.userId]
    );
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/request/:id/cancel', requireAuth, async (req, res) => {
  try {
    const requestId = req.params.id;
    const fresherId = req.userId;

    const [result] = await pool.query(
      'UPDATE mentorship_requests SET status = "cancelled", updated_at = NOW() WHERE id = ? AND fresher_id = ?',
      [requestId, fresherId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Request not found or not authorized' });
    }
    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/feedback', requireAuth, async (req, res) => {
  const { mentor_id, rating, feedback } = req.body;
  const fresher_id = req.userId;

  try {
    await pool.query(
      'INSERT INTO mentor_feedback (mentor_id, fresher_id, rating, feedback, session_date, created_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [mentor_id, fresher_id, rating, feedback]
    );

    await awardXP(fresher_id, 'feedback_submitted');
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const fresher_id = req.userId;

    const [totals] = await pool.query('SELECT COUNT(*) as total_mentors FROM seniors');
    const [requests] = await pool.query('SELECT status, ai_match_score FROM mentorship_requests WHERE fresher_id = ?', [fresher_id]);

    const pending_requests = requests.filter(r => r.status === 'pending').length;
    const accepted_requests = requests.filter(r => r.status === 'accepted').length;
    
    let avg_match_score = 0;
    if (requests.length > 0) {
      const sum = requests.reduce((acc, r) => acc + (r.ai_match_score || 0), 0);
      avg_match_score = sum / requests.length;
    }

    res.json({
      total_mentors: totals[0].total_mentors,
      pending_requests,
      accepted_requests,
      avg_match_score
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;