const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---- These are the "tools" Gemini can call. Each one hits the real database. ----

async function getTimetable(userId, args) {
  const [userRows] = await pool.query(
    'SELECT department_id, academic_year, section FROM users WHERE id = ?', [userId]
  );
  const user = userRows[0];
  const day = args.day_of_week || new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [rows] = await pool.query(
    `SELECT subject, faculty, classroom, start_time, end_time, is_lab FROM timetables
     WHERE department_id = ? AND academic_year = ? AND section = ? AND day_of_week = ?
     ORDER BY start_time ASC`,
    [user.department_id, user.academic_year, user.section, day]
  );
  return { day, classes: rows };
}

async function getEvents(userId, args) {
  const [rows] = await pool.query(
    `SELECT name, description, event_date, start_time, venue, organizing_club,
            total_seats, registered_count, (total_seats - registered_count) AS seats_remaining
     FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC LIMIT ?`,
    [args.limit || 5]
  );
  return { events: rows };
}

async function getLocation(userId, args) {
  const [rows] = await pool.query(
    'SELECT * FROM campus_locations WHERE name LIKE ?',
    [`%${args.location_name}%`]
  );
  return { locations: rows };
}

async function getSeniorsByDomain(userId, args) {
  const [rows] = await pool.query(
    `SELECT s.name, dom.name AS domain, s.skills, s.placement_status, s.contact_email
     FROM seniors s LEFT JOIN domains dom ON s.domain_id = dom.id
     WHERE dom.name LIKE ?`,
    [`%${args.domain}%`]
  );
  return { seniors: rows };
}

const toolImplementations = {
  getTimetable, getEvents, getLocation, getSeniorsByDomain
};

const tools = [{
  functionDeclarations: [
    {
      name: 'getTimetable',
      description: "Get the logged-in student's class timetable for a specific day. Use this for any question about classes, schedule, or where a class is.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          day_of_week: { type: SchemaType.STRING, description: 'e.g. Monday, Tuesday. Leave empty for today.' }
        }
      }
    },
    {
      name: 'getEvents',
      description: 'Get upcoming campus events, hackathons, and workshops with real seat availability.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: { type: SchemaType.NUMBER, description: 'Max number of events to return, default 5' }
        }
      }
    },
    {
      name: 'getLocation',
      description: 'Get information about a specific campus building or facility, e.g. BD Block, Library, Auditorium.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          location_name: { type: SchemaType.STRING, description: 'Name or partial name of the location' }
        },
        required: ['location_name']
      }
    },
    {
      name: 'getSeniorsByDomain',
      description: 'Find senior student mentors who specialize in a given domain, e.g. AI/ML, Web Development, Cloud.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          domain: { type: SchemaType.STRING, description: 'Domain name to search for' }
        },
        required: ['domain']
      }
    }
  ]
}];

// POST /api/chat  { message: "..." }
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(500).json({ error: 'Gemini API key not configured on server' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools,
      systemInstruction: `You are the Campus Copilot for a college freshers portal. Answer using the provided tools whenever the question relates to timetables, events, campus locations, or senior mentors — never guess this information. Keep answers short, friendly, energetic, and specific (mention exact times/rooms/names from tool results). Use emojis to make your responses lively and welcoming! If a question is unrelated to campus data (e.g. "explain recursion"), answer normally using your own knowledge. Always format your responses using markdown to make them readable.`
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle one or more rounds of function calling
    let functionCalls = response.functionCalls();
    let safetyCounter = 0;
    while (functionCalls && functionCalls.length > 0 && safetyCounter < 3) {
      const responses = [];
      for (const call of functionCalls) {
        const impl = toolImplementations[call.name];
        const output = impl ? await impl(req.userId, call.args || {}) : { error: 'Unknown tool' };
        responses.push({
          functionResponse: { name: call.name, response: output }
        });
      }
      result = await chat.sendMessage(responses);
      response = result.response;
      functionCalls = response.functionCalls();
      safetyCounter++;
    }

    const finalText = response.text();

    await pool.query(
      'INSERT INTO ai_chat_history (user_id, message, response) VALUES (?, ?, ?)',
      [req.userId, message, finalText]
    );

    res.json({ reply: finalText });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

module.exports = router;
