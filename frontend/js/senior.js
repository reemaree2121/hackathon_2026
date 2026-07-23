const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GET /api/seniors?domain=AI/ML
router.get('/seniors', async (req, res) => {
  try {
    const { domain } = req.query;
    let query = `
      SELECT s.id, s.name, d.name AS department, s.academic_year, dom.name AS domain,
             s.skills, s.placement_status, s.hackathons_won, s.clubs, s.bio, s.contact_email
      FROM seniors s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN domains dom ON s.domain_id = dom.id`;
    const params = [];
    if (domain) {
      query += ' WHERE dom.name = ?';
      params.push(domain);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load seniors' });
  }
});

// GET /api/domains — for the filter dropdown
router.get('/domains', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM domains ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load domains' });
  }
});

// GET /api/seniors/match?count=3 — AI-powered mentor matching for the logged-in student
router.get('/seniors/match', requireAuth, async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.query.count, 10) || 3, 1), 10);

    const [userRows] = await pool.query(
      `SELECT u.full_name, u.academic_year, u.section, d.name AS department, c.name AS course
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN courses c ON u.course_id = c.id
       WHERE u.id = ?`,
      [req.userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const student = userRows[0];

    const [candidateSeniors] = await pool.query(
      `SELECT s.id, s.name, d.name AS department, s.academic_year, dom.name AS domain,
              s.skills, s.placement_status, s.hackathons_won, s.clubs, s.bio
       FROM seniors s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN domains dom ON s.domain_id = dom.id`
    );

    if (candidateSeniors.length === 0) {
      return res.json({ matches: [] });
    }

    let matchIds = [];
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `You are the mentor-matching engine inside CampusSphere, a college portal used by real first-year students to find senior mentors.
Given one student's profile and a list of candidate senior mentors, select the top ${count} best matches. This is a real decision a student will act on, so be precise and specific — never generic.
STUDENT PROFILE:
- Name: ${student.full_name}
- Department: ${student.department}
- Course: ${student.course}
- Academic Year: ${student.academic_year}
- Section: ${student.section}
- Stated interests: ${student.interests || "not specified — infer only from department and course"}
CANDIDATE SENIORS (JSON array — this is the ONLY pool you may choose from):
${JSON.stringify(candidateSeniors, null, 2)}
Rules:
1. Only select seniors from the candidate list above. Never invent a name or detail not present in the data.
2. Prioritize overlap between the student's department/interests and each senior's domain, skills, or clubs.
3. For each match, write ONE sentence explaining why — it must cite a specific, concrete fact from that senior's actual data (e.g. their domain, a named skill, hackathons_won, placement_status, or a club they're in). No filler like "would be a great mentor" or "has a lot of experience."
4. If fewer than ${count} candidates are genuinely relevant, return fewer rather than padding with weak matches.
5. Return ONLY valid JSON — no markdown code fences, no preamble, no explanation outside the JSON.
Output format (exact shape):
{
  "matches": [
    { "seniorId": <number>, "reason": "<one concrete sentence>" }
  ]
}`;
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed.matches)) {
          matchIds = parsed.matches;
        }
      }
    } catch (aiErr) {
      console.error('AI mentor matching failed, falling back to empty matches:', aiErr.message);
    }

    const seniorById = new Map(candidateSeniors.map((s) => [s.id, s]));
    const matches = matchIds
      .filter((m) => seniorById.has(m.seniorId))
      .slice(0, count)
      .map((m) => ({ ...seniorById.get(m.seniorId), reason: m.reason }));

    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to match mentors' });
  }
});

module.exports = router;