const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const eventsRoutes = require('./routes/events');
const timetableRoutes = require('./routes/timetable');
const seniorsRoutes = require('./routes/seniors');
const campusRoutes = require('./routes/campus');
const chatRoutes = require('./routes/chat');
const booksRoutes = require('./routes/books');
const resourcesRoutes = require('./routes/resources');
const clubsRoutes = require('./routes/clubs');
const departmentsRoutes = require('./routes/departments');
const facultyRoutes = require('./routes/faculty');

const app = express();

// Allow the frontend (served from any origin/port, e.g. file://, localhost:5500, etc.)
// to call this API, including preflight OPTIONS requests.
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve the frontend folder as static files
// Visit: http://localhost:5000/dashboard.html
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Lightweight request logging for easier debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', eventsRoutes);
app.use('/api', timetableRoutes);
app.use('/api', seniorsRoutes);
app.use('/api', campusRoutes);
app.use('/api', chatRoutes);
app.use('/api', booksRoutes);
app.use('/api', resourcesRoutes);
app.use('/api', clubsRoutes);
app.use('/api', departmentsRoutes);
app.use('/api', facultyRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Centralized error handler — catches anything that reaches Express's default
// error-handling path (e.g. malformed JSON bodies, unexpected sync throws)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Freshers Portal API running on port ${PORT}`));
module.exports = app;
