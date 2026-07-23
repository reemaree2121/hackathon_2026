# Freshers Portal — Starter Build

Covers the 8 priority features from the strategy doc: Auth, Dashboard, Events (live seats + clash detection), Timetable, AI Campus Copilot (Gemini function calling), Seniors, Campus locations, XP.

## What's already built and working
- Full MySQL schema (15 tables, including a `faculty` table) + a programmatic
  realistic-data seeder (`backend/db/seed-realistic.js`) covering 7
  departments, 42 faculty, 224 students, full timetables, 26 events, 42
  senior mentors, 10 clubs, 16 campus locations, 16 notices, and 30+ books/resources
- Auth (register/login, JWT), with department/course dropdowns loaded live from `/api/departments` and `/api/courses`
- Events: list, detail, live seat-safe registration, timetable clash check, difficulty/eligibility/prerequisites shown
- Timetable: dynamic by department/year/section, linked to real faculty via `faculty_id`
- Faculty directory API (`/api/faculty`) — not yet wired to its own page, but ready for one
- **AI Campus Copilot**: Gemini function-calling, answers from real DB (not generic chat)
- Personalized AI dashboard insight (one Gemini call using the student's real schedule)
- Senior mentor directory with domain filter
- Campus locations, books & resources marketplace
- XP system tied to real actions (register, chat use, profile complete)
- Plain HTML/CSS/JS frontend, all 8 pages wired to the backend

## What's NOT built (intentionally — see the strategy doc's "Future Scope")
- A dedicated faculty directory page (the API is ready; the UI wasn't added so existing pages aren't redesigned)
- Notices are read-only (schema supports adding a "post notice" admin flow if time allows)
- Full interactive map (locations are shown as cards, per the strategy doc's recommendation)

---

## Setup — Step by Step

### 1. Install MySQL locally (if not already installed)
- Windows/Mac: install MySQL Community Server, or use XAMPP/WAMP
- Or use a free hosted MySQL (Railway, Clever Cloud, PlanetScale) if you don't want to install locally

### 2. Create the database
```bash
mysql -u root -p < backend/db/schema.sql
```

### 3. Configure environment variables
```bash
cd backend
cp .env.example .env
```
Edit `.env` and fill in:
- `DB_PASSWORD` — your MySQL root password
- `JWT_SECRET` — any long random string (e.g. generate one at randomkeygen.com)
- `GEMINI_API_KEY` — your Gemini API key (you said this is ready)

### 4. Install backend dependencies, seed realistic data, and run
```bash
cd backend
npm install
npm run seed    # populates every table with realistic Indian college data
npm start
```
You should see: `Freshers Portal API running on port 5000`

The seeder (`backend/db/seed-realistic.js`) truncates and repopulates every
table: 7 departments, 42 faculty, 224 students, full timetables for every
department/year/section, 26 events, 42 senior mentors, 10 clubs, 16 campus
locations, 16 notices, 30 books, and 34 shared resources. Every seeded
student's password is `Fresher@123` (e.g. log in as `23cse001@vbit.edu.in`
after seeding, once you know the roll number pattern — or just register a
fresh account).

Test it's alive: open `http://localhost:5000/api/health` in a browser — should show `{"status":"ok"}`.

### 5. Run the frontend
The frontend is plain HTML/CSS/JS — no build step needed. Easiest options:
- **VS Code Live Server extension**: right-click `frontend/index.html` → "Open with Live Server"
- Or: `cd frontend && npx serve` (or any static server)

Open the frontend URL, register a new account (pick CSE / 1st year / Section A to match the seeded timetable/events), and you're in.

### 6. Try the AI Copilot
Click the 💬 button (bottom-right) and ask:
- "Where is the BD block?"
- "What's my timetable today?"
- "Which seniors know cloud?"
- "Tell me about upcoming events"

If you get an error, double check `GEMINI_API_KEY` in `.env` and that you copied it correctly (no quotes, no extra spaces).

---

## Pushing to GitHub
```bash
git init
git add .
git commit -m "Initial scaffold: auth, events, timetable, AI copilot, seniors, campus, XP"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
**Important:** add a `.gitignore` (see below) so you never commit `.env` or `node_modules`.

Create `backend/.gitignore`:
```
node_modules/
.env
```

## Deploying for the live demo link
- **Backend:** Render.com or Railway.app (free tier) — set the same env vars in their dashboard
- **Database:** Railway or Clever Cloud both offer free MySQL instances — just point `DB_HOST` etc. at the hosted values
- **Frontend:** Netlify or Vercel (drag-and-drop the `frontend` folder), or GitHub Pages
- Once backend is deployed, update `API_BASE` in `frontend/js/api.js` to your live backend URL

---

## Suggested build order from here (matches the strategy doc's Day 1/Day 2 plan)
1. Get this running locally first — confirm login, events, timetable all work end to end
2. Test the AI Copilot thoroughly — this is your centerpiece, budget extra time here
3. Add the light XP visual polish (progress bar, 3-4 badge icons) on the profile card
4. Only if time remains: resource sharing (reuse the `resources` table already in the schema)
5. Deploy early (don't wait until the last hour) so you have a working live link as buffer

## Division of labor suggestion
- **Person A:** Backend (routes, DB, Gemini integration)
- **Person B:** Frontend pages + demo prep/rehearsal
- Both: pair on the AI Copilot prompt engineering — this is worth the joint attention
