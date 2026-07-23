const pool = require('../config/db');

async function awardXP(userId, action) {
  const xpMap = {
    'profile_complete': 10,
    'login': 2,
    'event_register': 5,
    'mentorship_request': 15,
    'mentorship_accepted': 25,
    'feedback_submitted': 10,
    'mentor_accepted_mentee': 20,
  };
  const points = xpMap[action] || 0;
  if (points > 0) {
    await pool.query('UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?', [points, userId]);
  }
}

module.exports = { awardXP };
