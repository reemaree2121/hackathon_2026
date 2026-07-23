/**
 * seed-realistic.js
 * ------------------------------------------------------------------
 * Wipes and repopulates every table with realistic Indian engineering
 * college data (200+ students, 40+ faculty, 25+ events, 40+ senior
 * mentors, full timetables for every dept/year/section, etc).
 *
 * This REPLACES backend/db/seed.sql as the source of seed data.
 * Run it after schema.sql has created the tables:
 *
 *   node db/seed-realistic.js
 *
 * Safe to re-run: it truncates every table first, so running it twice
 * just regenerates a fresh (still internally consistent) dataset.
 * ------------------------------------------------------------------
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Small deterministic-ish random helpers
// ---------------------------------------------------------------------------
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function pickMany(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function pad(num, len) { return String(num).padStart(len, '0'); }

// ---------------------------------------------------------------------------
// Name pools (Indian first/last names) — combined randomly, deduped
// ---------------------------------------------------------------------------
const FIRST_NAMES_MALE = [
  'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
  'Rohan','Karthik','Siddharth','Rahul','Nikhil','Varun','Aryan','Dhruv','Kabir','Manav',
  'Yash','Pranav','Akash','Abhishek','Harsh','Naveen','Suresh','Ramesh','Vikram','Sanjay',
  'Gaurav','Anirudh','Tarun','Vishal','Deepak','Rajesh','Kunal','Aman','Mohit','Rakesh'
];
const FIRST_NAMES_FEMALE = [
  'Ananya','Diya','Saanvi','Aadhya','Ira','Myra','Anika','Navya','Kavya','Riya',
  'Priya','Sneha','Divya','Pooja','Neha','Meera','Shreya','Aishwarya','Lakshmi','Swathi',
  'Nithya','Deepika','Ramya','Varsha','Sanjana','Bhavya','Harini','Keerthana','Priyanka','Ritika',
  'Sakshi','Tanvi','Rhea','Ishita','Kritika','Nandini','Pallavi','Sowmya','Vaishnavi','Yamini'
];
const SURNAMES = [
  'Sharma','Verma','Gupta','Iyer','Nair','Menon','Reddy','Rao','Naidu','Chowdary',
  'Patel','Shah','Mehta','Joshi','Kulkarni','Deshpande','Pillai','Krishnan','Subramaniam','Raman',
  'Agarwal','Bansal','Kapoor','Malhotra','Chopra','Bose','Banerjee','Chatterjee','Das','Ghosh',
  'Pandey','Mishra','Tiwari','Yadav','Singh','Chauhan','Rathore','Bhatt','Trivedi','Desai',
  'Balasubramanian','Venkatesh','Murthy','Prasad','Sinha','Saxena','Khanna','Arora','Ranganathan','Krishnamurthy'
];

function randomFullName() {
  const first = Math.random() < 0.5 ? pick(FIRST_NAMES_MALE) : pick(FIRST_NAMES_FEMALE);
  const last = pick(SURNAMES);
  return `${first} ${last}`;
}
function uniqueNameGenerator() {
  const used = new Set();
  return function next() {
    let name = randomFullName();
    let tries = 0;
    while (used.has(name) && tries < 20) { name = randomFullName(); tries++; }
    used.add(name);
    return name;
  };
}

// ---------------------------------------------------------------------------
// Departments, courses, domains
// ---------------------------------------------------------------------------
const DEPARTMENTS = [
  { code: 'CSE',   name: 'CSE' },
  { code: 'AIML',  name: 'AI & ML' },
  { code: 'IT',    name: 'IT' },
  { code: 'ECE',   name: 'ECE' },
  { code: 'EEE',   name: 'EEE' },
  { code: 'MECH',  name: 'Mechanical' },
  { code: 'CIVIL', name: 'Civil' }
];

const DOMAINS = [
  'AI/ML', 'Web Development', 'App Development', 'Cyber Security', 'UI/UX', 'Cloud',
  'Data Science', 'Competitive Programming', 'Robotics', 'Blockchain', 'Game Development',
  'Embedded Systems', 'Social Service', 'Performing Arts', 'Photography & Media', 'Entrepreneurship'
];

const COMMON_YEAR1_SUBJECTS = [
  'Engineering Mathematics I', 'Engineering Mathematics II', 'Engineering Physics',
  'Engineering Chemistry', 'Communication Skills', 'Environmental Science'
];

const INTRO_SUBJECT = {
  CSE: 'Problem Solving using C',
  AIML: 'Python Programming',
  IT: 'Programming Fundamentals',
  ECE: 'Basic Electronics Engineering',
  EEE: 'Elements of Electrical Engineering',
  MECH: 'Engineering Mechanics',
  CIVIL: 'Engineering Graphics'
};

// 12 subjects per department, roughly ordered year2 -> year4 (sliced 4 at a time)
const DEPT_SUBJECTS = {
  CSE: ['Data Structures','Object Oriented Programming','Database Management Systems','Operating Systems',
        'Computer Networks','Design & Analysis of Algorithms','Software Engineering','Web Technologies',
        'Machine Learning','Compiler Design','Cloud Computing','Cyber Security Fundamentals'],
  AIML: ['Data Structures','Statistics for AI','Database Management Systems','Object Oriented Programming',
         'Machine Learning','Deep Learning','Neural Networks','Natural Language Processing',
         'Computer Vision','Big Data Analytics','Reinforcement Learning','AI Ethics & Governance'],
  IT: ['Data Structures','Database Management Systems','Operating Systems','Object Oriented Programming',
       'Computer Networks','Web Technologies','Information Security','Cloud Computing',
       'Mobile App Development','Software Testing','IT Infrastructure Management','Data Mining'],
  ECE: ['Electronic Devices & Circuits','Digital Logic Design','Signals & Systems','Network Analysis',
        'Analog Communication','Digital Communication','Microprocessors & Microcontrollers','Electromagnetic Theory',
        'VLSI Design','Embedded Systems','Antenna & Wave Propagation','Wireless Networks'],
  EEE: ['Circuit Theory','Electrical Machines I','Electrical Machines II','Electromagnetic Fields',
        'Power Systems','Control Systems','Power Electronics','Microprocessors',
        'Renewable Energy Systems','Electrical Measurements','High Voltage Engineering','Switchgear & Protection'],
  MECH: ['Thermodynamics','Fluid Mechanics','Strength of Materials','Manufacturing Technology',
         'Machine Design','Heat Transfer','Dynamics of Machinery','CAD/CAM',
         'Automobile Engineering','Refrigeration & Air Conditioning','Robotics & Automation','Industrial Engineering'],
  CIVIL: ['Surveying','Strength of Materials','Building Materials & Construction','Fluid Mechanics',
          'Structural Analysis','Geotechnical Engineering','Concrete Technology','Transportation Engineering',
          'Environmental Engineering','Estimation & Costing','Design of Steel Structures','Water Resources Engineering']
};

function subjectsForYear(deptCode, yearNum) {
  if (yearNum === 1) {
    return [COMMON_YEAR1_SUBJECTS[0], COMMON_YEAR1_SUBJECTS[1], INTRO_SUBJECT[deptCode], COMMON_YEAR1_SUBJECTS[4]];
  }
  const pool = DEPT_SUBJECTS[deptCode];
  const start = (yearNum - 2) * 4;
  return pool.slice(start, start + 4);
}

const YEARS = ['1st', '2nd', '3rd', '4th'];
const SECTIONS = ['A', 'B'];
const CURRENT_YEAR = new Date().getFullYear();
const JOIN_YEAR_FOR = { '1st': CURRENT_YEAR, '2nd': CURRENT_YEAR - 1, '3rd': CURRENT_YEAR - 2, '4th': CURRENT_YEAR - 3 };

const COLLEGE_DOMAIN = 'vbit.edu.in';

async function main() {
  console.log('Connecting and wiping existing data...');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  const tablesToClear = [
    'ai_chat_history', 'event_registrations', 'books', 'resources', 'timetables',
    'events', 'seniors', 'clubs', 'notices', 'campus_locations', 'users', 'faculty',
    'courses', 'domains', 'departments'
  ];
  for (const t of tablesToClear) {
    await pool.query(`TRUNCATE TABLE ${t}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  const summary = {};

  // ---------------- Departments ----------------
  const deptIds = {};
  for (const d of DEPARTMENTS) {
    const [r] = await pool.query('INSERT INTO departments (name) VALUES (?)', [d.name]);
    deptIds[d.code] = r.insertId;
  }
  summary.departments = DEPARTMENTS.length;

  // ---------------- Courses (one B.Tech course per department) ----------------
  const courseIds = {};
  for (const d of DEPARTMENTS) {
    const [r] = await pool.query(
      'INSERT INTO courses (name, department_id) VALUES (?, ?)',
      [`B.Tech ${d.name}`, deptIds[d.code]]
    );
    courseIds[d.code] = r.insertId;
  }
  summary.courses = DEPARTMENTS.length;

  // ---------------- Domains ----------------
  const domainIds = {};
  for (const name of DOMAINS) {
    const [r] = await pool.query('INSERT INTO domains (name) VALUES (?)', [name]);
    domainIds[name] = r.insertId;
  }
  summary.domains = DOMAINS.length;

  // ---------------- Faculty (6 per department = 42) ----------------
  const nextName = uniqueNameGenerator();
  const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Assistant Professor', 'Assistant Professor', 'Lab Instructor'];
  const facultyByDept = {}; // deptCode -> [{id, name}]
  const facultyRows = [];
  for (const d of DEPARTMENTS) {
    facultyByDept[d.code] = [];
    const subjectPool = [INTRO_SUBJECT[d.code], ...COMMON_YEAR1_SUBJECTS.slice(0, 2), ...DEPT_SUBJECTS[d.code]];
    for (let i = 0; i < 6; i++) {
      const name = nextName();
      const designation = i === 0 ? 'HOD & Professor' : DESIGNATIONS[i];
      const subjects = pickMany(subjectPool, randInt(2, 3)).join(', ');
      const office = `${d.code}-${randInt(1, 4)}${pad(randInt(1, 20), 2)}`;
      const emailLocal = name.toLowerCase().replace(/\s+/g, '.') + (i === 0 ? '.hod' : '');
      const email = `${emailLocal}@${COLLEGE_DOMAIN}`;
      facultyRows.push([name, designation, deptIds[d.code], subjects, office, email]);
    }
  }
  for (const row of facultyRows) {
    const [r] = await pool.query(
      'INSERT INTO faculty (name, designation, department_id, subjects_handled, office_room, email) VALUES (?, ?, ?, ?, ?, ?)',
      row
    );
    const deptCode = DEPARTMENTS.find(d => deptIds[d.code] === row[2]).code;
    facultyByDept[deptCode].push({ id: r.insertId, name: row[0] });
  }
  summary.faculty = facultyRows.length;

  // ---------------- Students (users) — 4 per dept/year/section = 224 ----------------
  const STUDENTS_PER_BUCKET = 4;
  const studentRows = [];
  const rollCounters = {}; // deptCode -> serial counter
  const passwordHash = await bcrypt.hash('Fresher@123', 10);

  for (const d of DEPARTMENTS) {
    rollCounters[d.code] = 0;
    for (const year of YEARS) {
      for (const section of SECTIONS) {
        for (let i = 0; i < STUDENTS_PER_BUCKET; i++) {
          rollCounters[d.code]++;
          const joinYear = JOIN_YEAR_FOR[year];
          const yy = String(joinYear).slice(-2);
          const rollNumber = `${yy}${d.code}${pad(rollCounters[d.code], 3)}`;
          const name = nextName();
          const email = `${rollNumber.toLowerCase()}@${COLLEGE_DOMAIN}`;
          const batch = `${joinYear}-${joinYear + 4}`;
          studentRows.push([
            name, email, rollNumber, passwordHash, deptIds[d.code], courseIds[d.code],
            year, section, batch
          ]);
        }
      }
    }
  }
  // batch insert
  const STUDENT_BATCH_SIZE = 50;
  const studentIds = []; // parallel array of inserted ids in the same order as studentRows
  for (let i = 0; i < studentRows.length; i += STUDENT_BATCH_SIZE) {
    const batch = studentRows.slice(i, i + STUDENT_BATCH_SIZE);
    const [r] = await pool.query(
      `INSERT INTO users (full_name, email, roll_number, password_hash, department_id, course_id, academic_year, section, batch_number) VALUES ?`,
      [batch]
    );
    const firstId = r.insertId;
    for (let j = 0; j < batch.length; j++) studentIds.push(firstId + j);
  }
  summary.students = studentRows.length;

  // Build a lookup of student ids grouped by department for later (books/resources ownership)
  const studentsByDept = {};
  {
    let idx = 0;
    for (const d of DEPARTMENTS) {
      studentsByDept[d.code] = [];
      for (const year of YEARS) {
        for (const section of SECTIONS) {
          for (let i = 0; i < STUDENTS_PER_BUCKET; i++) {
            studentsByDept[d.code].push({ id: studentIds[idx], year, section });
            idx++;
          }
        }
      }
    }
  }

  // ---------------- Timetables ----------------
  const PERIODS = [
    ['09:00:00', '10:00:00'],
    ['10:00:00', '11:00:00'],
    ['11:15:00', '12:15:00'],
    ['13:15:00', '14:15:00']
  ];
  const LAB_TIME = ['14:15:00', '16:15:00'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const LAB_DAYS = ['Tuesday', 'Thursday'];

  const timetableRows = [];
  for (const d of DEPARTMENTS) {
    const faculty = facultyByDept[d.code];
    for (let yearIdx = 0; yearIdx < YEARS.length; yearIdx++) {
      const yearNum = yearIdx + 1;
      const year = YEARS[yearIdx];
      const subjects = subjectsForYear(d.code, yearNum);
      for (const section of SECTIONS) {
        DAYS.forEach((day, dayIdx) => {
          PERIODS.forEach((time, periodIdx) => {
            const subject = subjects[(dayIdx + periodIdx) % subjects.length];
            const fac = faculty[(dayIdx + periodIdx) % faculty.length];
            const classroom = `${d.code}-${yearNum}${section}`;
            timetableRows.push([
              deptIds[d.code], year, section, day, time[0], time[1],
              subject, fac.name, fac.id, classroom, false
            ]);
          });
          if (LAB_DAYS.includes(day)) {
            const labSubject = `${subjects[dayIdx % subjects.length]} Lab`;
            const fac = faculty[(dayIdx + 2) % faculty.length];
            const labRoom = `${d.code}-Lab-${(dayIdx % 2) + 1}`;
            timetableRows.push([
              deptIds[d.code], year, section, day, LAB_TIME[0], LAB_TIME[1],
              labSubject, fac.name, fac.id, labRoom, true
            ]);
          }
        });
      }
    }
  }
  const TT_BATCH_SIZE = 100;
  for (let i = 0; i < timetableRows.length; i += TT_BATCH_SIZE) {
    const batch = timetableRows.slice(i, i + TT_BATCH_SIZE);
    await pool.query(
      `INSERT INTO timetables (department_id, academic_year, section, day_of_week, start_time, end_time, subject, faculty, faculty_id, classroom, is_lab) VALUES ?`,
      [batch]
    );
  }
  summary.timetableEntries = timetableRows.length;

  // ---------------- Clubs ----------------
  const CLUBS = [
    { name: 'Coding Club', domain: 'Competitive Programming', desc: 'Weekly contests, DSA practice, and prep for Codeforces/CodeChef rated rounds.' },
    { name: 'AI Club', domain: 'AI/ML', desc: 'Explore machine learning, build models, and compete in Kaggle competitions.' },
    { name: 'Web Dev Club', domain: 'Web Development', desc: 'Learn full-stack development and ship real-world web applications together.' },
    { name: 'Robotics Club', domain: 'Robotics', desc: 'Design, build, and program robots for inter-college robotics competitions.' },
    { name: 'Photography Club', domain: 'Photography & Media', desc: 'Campus photowalks, editing workshops, and covering college events on camera.' },
    { name: 'NSS', domain: 'Social Service', desc: 'National Service Scheme unit running community outreach and campus clean-up drives.' },
    { name: 'Dance Club', domain: 'Performing Arts', desc: 'Classical and contemporary dance crews that perform at fests across the year.' },
    { name: 'Music Club', domain: 'Performing Arts', desc: 'Vocal and instrumental jam sessions, open mics, and the annual battle of bands.' },
    { name: 'Entrepreneurship Cell', domain: 'Entrepreneurship', desc: 'Startup mentorship, pitch nights, and a seed fund for student-run ventures.' },
    { name: 'Cloud Club', domain: 'Cloud', desc: 'Hands-on labs for AWS, Azure, and Google Cloud plus certification study groups.' }
  ];
  const clubIds = {};
  for (const c of CLUBS) {
    const [r] = await pool.query(
      'INSERT INTO clubs (name, description, domain_id, contact_email) VALUES (?, ?, ?, ?)',
      [c.name, c.desc, domainIds[c.domain], `${c.name.toLowerCase().replace(/[^a-z]+/g, '')}@${COLLEGE_DOMAIN}`]
    );
    clubIds[c.name] = r.insertId;
  }
  summary.clubs = CLUBS.length;

  // ---------------- Campus locations ----------------
  const CAMPUS_LOCATIONS = [
    { name: 'CSE & IT Block', desc: 'Academic block housing CSE and IT classrooms, faculty cabins, and the software labs.', department: 'CSE / IT', nearby: 'Central Library, Cafeteria', floor: 'Ground to 4th floor' },
    { name: 'AI & ML Block', desc: 'Dedicated block for AI & ML with GPU-equipped labs and a data science reading room.', department: 'AI & ML', nearby: 'CSE & IT Block, Cafeteria', floor: 'Ground to 3rd floor' },
    { name: 'ECE & EEE Block', desc: 'Academic block for ECE and EEE with electronics, communication, and power systems labs.', department: 'ECE / EEE', nearby: 'Central Workshop, Auditorium', floor: 'Ground to 4th floor' },
    { name: 'Mechanical & Civil Block', desc: 'Houses Mechanical and Civil departments along with drawing halls and design studios.', department: 'Mechanical / Civil', nearby: 'Central Workshop, Sports Complex', floor: 'Ground to 3rd floor' },
    { name: 'Central Library', desc: 'Four-floor library with digital resource access, journal archives, and 24x7 quiet study zones during exams.', department: 'Common', nearby: 'CSE & IT Block, Cafeteria', floor: 'Ground to 3rd floor' },
    { name: 'Main Auditorium', desc: '900-seat venue for hackathons, technical fests, guest lectures, and cultural nights.', department: 'Common', nearby: 'ECE & EEE Block, Admin Block', floor: 'Ground floor' },
    { name: 'Cafeteria', desc: 'Main food court serving South Indian, North Indian, and quick snacks between classes.', department: 'Common', nearby: 'CSE & IT Block, Central Library', floor: 'Ground floor' },
    { name: 'Boys Hostel', desc: 'Residential block for male students with mess, common room, and Wi-Fi enabled rooms.', department: 'Residential', nearby: 'Sports Complex, Medical Centre', floor: 'Ground to 5th floor' },
    { name: 'Girls Hostel', desc: 'Residential block for female students with mess, common room, and 24x7 security.', department: 'Residential', nearby: 'Sports Complex, Medical Centre', floor: 'Ground to 5th floor' },
    { name: 'Sports Complex', desc: 'Basketball and volleyball courts, a cricket ground, gym, and an indoor badminton hall.', department: 'Common', nearby: 'Hostels, Medical Centre', floor: 'Ground floor' },
    { name: 'Medical Centre', desc: 'On-campus clinic with a resident doctor and nurse for first aid and minor emergencies.', department: 'Administrative', nearby: 'Hostels, Sports Complex', floor: 'Ground floor' },
    { name: 'Placement Cell', desc: 'Handles internships, placement drives, resume reviews, and mock interviews.', department: 'Administrative', nearby: 'Admin Block, Main Auditorium', floor: '1st floor' },
    { name: 'Robotics & Innovation Lab', desc: 'Maker space with 3D printers, Arduino/Raspberry Pi kits, and robotics competition gear.', department: 'ECE / MECH', nearby: 'ECE & EEE Block, Central Workshop', floor: '2nd floor' },
    { name: 'Central Workshop', desc: 'Mechanical workshop with lathes, welding bays, and CNC machines for practical sessions.', department: 'Mechanical', nearby: 'Mechanical & Civil Block', floor: 'Ground floor' },
    { name: 'Admin Block', desc: 'Houses the Principal\u2019s office, exam cell, accounts, and student affairs office.', department: 'Administrative', nearby: 'Main Auditorium, Placement Cell', floor: 'Ground to 2nd floor' },
    { name: 'Innovation & Incubation Centre', desc: 'Co-working space for the Entrepreneurship Cell and student startup teams.', department: 'Common', nearby: 'AI & ML Block, Central Library', floor: '1st floor' }
  ];
  for (const c of CAMPUS_LOCATIONS) {
    await pool.query(
      'INSERT INTO campus_locations (name, description, department, nearby_facilities, floor_info) VALUES (?, ?, ?, ?, ?)',
      [c.name, c.desc, c.department, c.nearby, c.floor]
    );
  }
  summary.campusLocations = CAMPUS_LOCATIONS.length;

  // ---------------- Events (26) ----------------
  const today = new Date();
  function dateOffset(days) {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + days);
    return d2.toISOString().slice(0, 10);
  }
  function deadlineBefore(dateStr, daysBefore) {
    const d2 = new Date(dateStr);
    d2.setDate(d2.getDate() - daysBefore);
    return `${d2.toISOString().slice(0, 10)} 23:59:00`;
  }

  const EVENT_TEMPLATES = [
    { name: 'Freshers Welcome Meetup', club: 'Student Council', venue: 'Main Auditorium', desc: 'Orientation and networking event for all new students joining this year.', elig: 'First years only', prereq: 'None', diff: 'Beginner', seats: 220, offset: -6 },
    { name: 'AI Innovation Hackathon', club: 'AI Club', venue: 'Main Auditorium', desc: 'Build AI-powered solutions to real campus problems in 24 hours.', elig: 'All years', prereq: 'Laptop required, basic Python', diff: 'Intermediate', seats: 80, offset: 4 },
    { name: 'Web Dev Bootcamp', club: 'Web Dev Club', venue: 'CSE & IT Block', desc: 'Hands-on introduction to full-stack web development with HTML, CSS, and JS.', elig: 'All years', prereq: 'Basic HTML/CSS', diff: 'Beginner', seats: 60, offset: 9 },
    { name: 'Competitive Programming Sprint', club: 'Coding Club', venue: 'CSE & IT Block', desc: 'A 3-hour rated contest with problems ranging from easy to hard.', elig: 'All years', prereq: 'Comfortable with C++/Java/Python', diff: 'Advanced', seats: 100, offset: 12 },
    { name: 'Robotics Design Challenge', club: 'Robotics Club', venue: 'Robotics & Innovation Lab', desc: 'Teams design and race line-following robots for prizes.', elig: 'All years', prereq: 'Basic electronics knowledge', diff: 'Intermediate', seats: 40, offset: 15 },
    { name: 'Cloud Computing Workshop', club: 'Cloud Club', venue: 'AI & ML Block', desc: 'Hands-on session deploying your first app on AWS free tier.', elig: 'All years', prereq: 'Laptop with AWS free-tier account', diff: 'Beginner', seats: 50, offset: 18 },
    { name: 'Photography Walk: Campus Edition', club: 'Photography Club', venue: 'Sports Complex', desc: 'Golden-hour photowalk across campus followed by an editing workshop.', elig: 'All years', prereq: 'Any camera or smartphone', diff: 'Beginner', seats: 35, offset: 20 },
    { name: 'Community Clean-Up Drive', club: 'NSS', venue: 'Sports Complex', desc: 'Campus and neighbourhood clean-up drive followed by a plantation activity.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 150, offset: 22 },
    { name: 'Battle of the Bands', club: 'Music Club', venue: 'Main Auditorium', desc: 'Inter-department band competition with a live audience and judges panel.', elig: 'All years', prereq: 'Registered band of 3-6 members', diff: 'Beginner', seats: 300, offset: 25 },
    { name: 'Startup Pitch Night', club: 'Entrepreneurship Cell', venue: 'Innovation & Incubation Centre', desc: 'Pitch your startup idea to alumni investors and win seed funding.', elig: 'All years', prereq: '5-slide pitch deck', diff: 'Intermediate', seats: 60, offset: 28 },
    { name: 'Classical Dance Fest', club: 'Dance Club', venue: 'Main Auditorium', desc: 'Solo and group classical dance performances judged by guest artists.', elig: 'All years', prereq: 'Prior registration of act', diff: 'Beginner', seats: 250, offset: 30 },
    { name: 'Machine Learning Study Jam', club: 'AI Club', venue: 'AI & ML Block', desc: 'Peer-led study group working through a Kaggle competition together.', elig: 'All years', prereq: 'Basic Python and pandas', diff: 'Intermediate', seats: 45, offset: 33 },
    { name: 'Cyber Security CTF', club: 'Coding Club', venue: 'CSE & IT Block', desc: 'Capture-the-flag competition covering web, crypto, and forensics challenges.', elig: '2nd year and above', prereq: 'Laptop, Linux basics', diff: 'Advanced', seats: 70, offset: 36 },
    { name: 'Resume & Mock Interview Clinic', club: 'Placement Cell', venue: 'Placement Cell', desc: 'One-on-one resume reviews and mock technical interviews with alumni.', elig: '3rd and 4th years', prereq: 'Bring an updated resume', diff: 'Beginner', seats: 40, offset: 40 },
    { name: 'App Dev Sprint', club: 'Web Dev Club', venue: 'CSE & IT Block', desc: 'Build and ship a working mobile app prototype in one weekend.', elig: 'All years', prereq: 'Basic JavaScript', diff: 'Intermediate', seats: 50, offset: 43 },
    { name: 'Robotics & Automation Expo', club: 'Robotics Club', venue: 'Robotics & Innovation Lab', desc: 'Showcase of student robotics projects with live demos.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 120, offset: 46 },
    { name: 'Blockchain & Web3 Talk', club: 'Coding Club', venue: 'AI & ML Block', desc: 'Guest talk on blockchain fundamentals and career paths in Web3.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 100, offset: 49 },
    { name: 'Inter-Department Cricket Cup', club: 'Student Council', venue: 'Sports Complex', desc: 'Knockout cricket tournament between all seven departments.', elig: 'All years', prereq: 'Team of 11 + 3 substitutes', diff: 'Beginner', seats: 200, offset: 52 },
    { name: 'UI/UX Design Sprint', club: 'Web Dev Club', venue: 'AI & ML Block', desc: 'Figma-based design sprint solving a real campus-app usability problem.', elig: 'All years', prereq: 'Laptop with Figma installed', diff: 'Intermediate', seats: 40, offset: 55 },
    { name: 'Data Science Case Study Day', club: 'AI Club', venue: 'AI & ML Block', desc: 'Teams analyse a real anonymised dataset and present insights.', elig: 'All years', prereq: 'Basic statistics', diff: 'Intermediate', seats: 45, offset: 58 },
    { name: 'Open Mic Night', club: 'Music Club', venue: 'Cafeteria', desc: 'Casual open mic for music, poetry, and stand-up comedy.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 90, offset: 61 },
    { name: 'Green Campus Plantation Drive', club: 'NSS', venue: 'Mechanical & Civil Block', desc: 'Tree plantation drive around the Mechanical & Civil block grounds.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 100, offset: 64 },
    { name: 'Entrepreneurship Bootcamp', club: 'Entrepreneurship Cell', venue: 'Innovation & Incubation Centre', desc: 'Two-day intensive on validating and pitching a business idea from scratch.', elig: 'All years', prereq: 'None', diff: 'Intermediate', seats: 50, offset: 67 },
    { name: 'CAD Design Challenge', club: 'Robotics Club', venue: 'Mechanical & Civil Block', desc: 'Timed CAD modelling challenge judged on accuracy and design efficiency.', elig: 'All years', prereq: 'Familiarity with AutoCAD/SolidWorks', diff: 'Intermediate', seats: 40, offset: 70 },
    { name: 'Annual Tech Fest — Innovate', club: 'Student Council', venue: 'Main Auditorium', desc: 'Flagship two-day tech fest with hackathons, workshops, and guest speakers.', elig: 'All years', prereq: 'None', diff: 'Beginner', seats: 500, offset: 75 },
    { name: 'Photography Exhibition Night', club: 'Photography Club', venue: 'Central Library', desc: 'Exhibition of the best student photography from the year, with an awards round.', elig: 'All years', prereq: 'Submit photos in advance', diff: 'Beginner', seats: 80, offset: 78 }
  ];

  const eventRows = EVENT_TEMPLATES.map(e => {
    const eventDate = dateOffset(e.offset);
    const registered = Math.min(e.seats, Math.max(0, Math.round(e.seats * (0.2 + Math.random() * 0.75))));
    return [
      e.name, e.desc, null, eventDate, '09:00:00', '17:00:00', e.venue, e.club,
      e.elig, e.prereq, deadlineBefore(eventDate, 1), e.seats, registered, e.diff
    ];
  });
  await pool.query(
    `INSERT INTO events (name, description, poster_url, event_date, start_time, end_time, venue, organizing_club, eligibility, prerequisites, registration_deadline, total_seats, registered_count, difficulty) VALUES ?`,
    [eventRows]
  );
  summary.events = eventRows.length;

  // ---------------- Notices ----------------
  const NOTICES = [
    { title: 'Hackathon Registration Open', body: 'Register for the AI Innovation Hackathon before the deadline shown on the Events page.' },
    { title: 'Orientation Schedule Released', body: 'Check the Events page for the full Freshers Welcome Meetup schedule.' },
    { title: 'Library Extended Hours During Exams', body: 'The Central Library will stay open 24x7 during the upcoming semester exams.' },
    { title: 'Mid-Semester Exam Timetable Published', body: 'Mid-semester exam timetables for all departments are now available from your department office.' },
    { title: 'Placement Drive: TCS & Infosys', body: 'On-campus placement drive for pre-final and final year students. Register at the Placement Cell.' },
    { title: 'Hostel Mess Menu Updated', body: 'The revised weekly mess menu for both hostels is now on display outside the dining hall.' },
    { title: 'Fee Payment Deadline Extended', body: 'The last date for semester fee payment has been extended by one week.' },
    { title: 'Bus Route Changes', club: null, body: 'Two campus bus routes have minor timing changes starting next Monday. Check the transport office notice board.' },
    { title: 'Annual Tech Fest — Call for Volunteers', body: 'Sign up to volunteer for Innovate, the annual tech fest, at the Student Council desk.' },
    { title: 'Scholarship Applications Open', body: 'Merit and need-based scholarship applications for this academic year are now open.' },
    { title: 'Wi-Fi Maintenance Window', body: 'Campus Wi-Fi will be temporarily unavailable during a scheduled maintenance window this weekend.' },
    { title: 'Guest Lecture on Emerging Tech', body: 'An industry guest lecture on emerging technologies will be held in the Main Auditorium.' },
    { title: 'Sports Complex Renovation Update', body: 'The indoor badminton hall will remain closed for renovation this month; other facilities remain open.' },
    { title: 'Blood Donation Camp by NSS', body: 'NSS is organising a blood donation camp in association with the Medical Centre.' },
    { title: 'Lost and Found Desk', body: 'Items found around campus this month can be collected from the Admin Block reception.' },
    { title: 'Semester Registration Reminder', body: 'Complete your course registration for the upcoming semester before the deadline.' }
  ];
  for (const n of NOTICES) {
    await pool.query('INSERT INTO notices (title, body) VALUES (?, ?)', [n.title, n.body]);
  }
  summary.notices = NOTICES.length;

  // ---------------- Seniors / mentors (6 per department = 42) ----------------
  const PLACEMENT_COMPANIES = [
    'Google', 'Microsoft', 'Amazon', 'Adobe', 'Flipkart', 'Zoho', 'Qualcomm', 'Intel',
    'Samsung R&D', 'TCS Digital', 'Infosys', 'Deloitte', 'Goldman Sachs', 'JPMorgan Chase',
    'Accenture', 'Wipro', 'Cognizant', 'Texas Instruments'
  ];
  const SKILLS_BY_DOMAIN = {
    'AI/ML': 'Python, TensorFlow, scikit-learn, NLP',
    'Web Development': 'React, Node.js, MongoDB, REST APIs',
    'App Development': 'Flutter, Kotlin, Firebase',
    'Cyber Security': 'Network Security, Burp Suite, Ethical Hacking',
    'UI/UX': 'Figma, User Research, Prototyping',
    'Cloud': 'AWS, Docker, Kubernetes, Terraform',
    'Data Science': 'Python, Pandas, SQL, Power BI',
    'Competitive Programming': 'C++, DSA, Codeforces (Expert)',
    'Robotics': 'ROS, Arduino, Embedded C',
    'Blockchain': 'Solidity, Ethereum, Smart Contracts',
    'Game Development': 'Unity, C#, Blender',
    'Embedded Systems': 'Embedded C, ARM, RTOS',
    'Social Service': 'Community Outreach, Event Coordination',
    'Performing Arts': 'Choreography, Event Direction',
    'Photography & Media': 'Photography, Adobe Lightroom, Video Editing',
    'Entrepreneurship': 'Business Modelling, Pitching, Market Research'
  };
  const seniorRows = [];
  for (const d of DEPARTMENTS) {
    for (let i = 0; i < 6; i++) {
      const name = nextName();
      const domain = DOMAINS[randInt(0, DOMAINS.length - 1)];
      const year = pick(['3rd', '4th']);
      const company = pick(PLACEMENT_COMPANIES);
      const placementStatus = Math.random() < 0.75 ? `Placed at ${company}` : `Intern at ${company}`;
      const hackathons = randInt(0, 5);
      const clubs = pickMany(CLUBS, randInt(1, 2)).map(c => c.name).join(', ');
      const skills = SKILLS_BY_DOMAIN[domain];
      const bio = `Final-year ${d.name} student specialising in ${domain.toLowerCase()}, enjoys mentoring juniors on ${skills.split(',')[0].trim()} and helping them prep for their first hackathon.`;
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@${COLLEGE_DOMAIN}`;
      seniorRows.push([name, deptIds[d.code], year, domainIds[domain], skills, placementStatus, hackathons, clubs, bio, email]);
    }
  }
  const SENIOR_BATCH = 20;
  for (let i = 0; i < seniorRows.length; i += SENIOR_BATCH) {
    const batch = seniorRows.slice(i, i + SENIOR_BATCH);
    await pool.query(
      'INSERT INTO seniors (name, department_id, academic_year, domain_id, skills, placement_status, hackathons_won, clubs, bio, contact_email) VALUES ?',
      [batch]
    );
  }
  summary.seniors = seniorRows.length;

  // ---------------- Books (30, owned by random students) ----------------
  const BOOK_TEMPLATES = [
    { name: 'Engineering Mathematics', subject: 'Engineering Mathematics I', sem: '1st', cond: 'Good', price: 250 },
    { name: 'Let Us C', subject: 'Programming Fundamentals', sem: '1st', cond: 'Like New', price: 150 },
    { name: 'Data Structures Through C', subject: 'Data Structures', sem: '2nd', cond: 'Good', price: 300 },
    { name: 'Database System Concepts', subject: 'Database Management Systems', sem: '3rd', cond: 'Fair', price: 350 },
    { name: 'Operating System Concepts', subject: 'Operating Systems', sem: '3rd', cond: 'Good', price: 320 },
    { name: 'Computer Networks (Tanenbaum)', subject: 'Computer Networks', sem: '4th', cond: 'Good', price: 400 },
    { name: 'Introduction to Algorithms (CLRS)', subject: 'Design & Analysis of Algorithms', sem: '5th', cond: 'Fair', price: 500 },
    { name: 'Deep Learning (Goodfellow)', subject: 'Deep Learning', sem: '5th', cond: 'Like New', price: 550 },
    { name: 'Digital Logic & Computer Design', subject: 'Digital Logic Design', sem: '3rd', cond: 'Good', price: 300 },
    { name: 'Electronic Devices & Circuits', subject: 'Electronic Devices & Circuits', sem: '3rd', cond: 'Fair', price: 280 },
    { name: 'Signals & Systems (Oppenheim)', subject: 'Signals & Systems', sem: '4th', cond: 'Good', price: 350 },
    { name: 'Electrical Machines', subject: 'Electrical Machines I', sem: '4th', cond: 'Good', price: 320 },
    { name: 'Power System Analysis', subject: 'Power Systems', sem: '5th', cond: 'Fair', price: 380 },
    { name: 'Thermodynamics: An Engineering Approach', subject: 'Thermodynamics', sem: '3rd', cond: 'Good', price: 400 },
    { name: 'Strength of Materials', subject: 'Strength of Materials', sem: '4th', cond: 'Fair', price: 300 },
    { name: 'Fluid Mechanics & Hydraulic Machines', subject: 'Fluid Mechanics', sem: '4th', cond: 'Good', price: 350 },
    { name: 'Surveying Vol. 1', subject: 'Surveying', sem: '3rd', cond: 'Good', price: 280 },
    { name: 'Structural Analysis', subject: 'Structural Analysis', sem: '5th', cond: 'Fair', price: 350 },
    { name: 'Concrete Technology', subject: 'Concrete Technology', sem: '6th', cond: 'Good', price: 320 },
    { name: 'Machine Design Data Book', subject: 'Machine Design', sem: '5th', cond: 'Like New', price: 250 }
  ];
  const bookRows = [];
  const allDeptCodes = DEPARTMENTS.map(d => d.code);
  for (let i = 0; i < 30; i++) {
    const t = BOOK_TEMPLATES[i % BOOK_TEMPLATES.length];
    const deptCode = allDeptCodes[i % allDeptCodes.length];
    const owner = pick(studentsByDept[deptCode]);
    bookRows.push([t.name, t.subject, t.sem, deptIds[deptCode], t.cond, t.price, owner.id]);
  }
  await pool.query(
    'INSERT INTO books (book_name, subject, semester, department_id, `condition`, price, owner_id) VALUES ?',
    [bookRows]
  );
  summary.books = bookRows.length;

  // ---------------- Resources (34, uploaded by random students) ----------------
  const RESOURCE_TEMPLATES = [
    { title: 'Data Structures Notes', type: 'notes', subject: 'Data Structures', sem: '2nd', link: 'https://drive.google.com/example/ds-notes.pdf' },
    { title: 'Previous Year Question Paper - Maths I', type: 'pyq', subject: 'Engineering Mathematics I', sem: '1st', link: 'https://drive.google.com/example/maths1-pyq.pdf' },
    { title: 'DBMS Complete Notes', type: 'pdf', subject: 'Database Management Systems', sem: '3rd', link: 'https://drive.google.com/example/dbms-notes.pdf' },
    { title: 'Operating Systems Cheatsheet', type: 'notes', subject: 'Operating Systems', sem: '3rd', link: 'https://drive.google.com/example/os-cheatsheet.pdf' },
    { title: 'Computer Networks PYQ Bundle', type: 'pyq', subject: 'Computer Networks', sem: '4th', link: 'https://drive.google.com/example/cn-pyq.pdf' },
    { title: 'DSA Practice Repository', type: 'github', subject: 'Data Structures', sem: '2nd', link: 'https://github.com/example/dsa-practice' },
    { title: 'ML Course Companion Repo', type: 'github', subject: 'Machine Learning', sem: '5th', link: 'https://github.com/example/ml-course-companion' },
    { title: 'Competitive Programming Handbook', type: 'website', subject: 'Design & Analysis of Algorithms', sem: '5th', link: 'https://cp-algorithms.com' },
    { title: 'freeCodeCamp Web Dev Curriculum', type: 'website', subject: 'Web Technologies', sem: '4th', link: 'https://www.freecodecamp.org' },
    { title: 'Digital Logic Design Lab Manual', type: 'pdf', subject: 'Digital Logic Design', sem: '3rd', link: 'https://drive.google.com/example/dld-lab-manual.pdf' },
    { title: 'Signals & Systems Notes', type: 'notes', subject: 'Signals & Systems', sem: '4th', link: 'https://drive.google.com/example/signals-notes.pdf' },
    { title: 'VLSI Design PYQ Set', type: 'pyq', subject: 'VLSI Design', sem: '6th', link: 'https://drive.google.com/example/vlsi-pyq.pdf' },
    { title: 'Power Electronics Notes', type: 'notes', subject: 'Power Electronics', sem: '5th', link: 'https://drive.google.com/example/power-electronics-notes.pdf' },
    { title: 'Control Systems Simulation Repo', type: 'github', subject: 'Control Systems', sem: '5th', link: 'https://github.com/example/control-systems-sim' },
    { title: 'Thermodynamics Formula Sheet', type: 'notes', subject: 'Thermodynamics', sem: '3rd', link: 'https://drive.google.com/example/thermo-formulas.pdf' },
    { title: 'CAD Model Library', type: 'drive', subject: 'CAD/CAM', sem: '6th', link: 'https://drive.google.com/example/cad-model-library' },
    { title: 'Surveying Field Data Templates', type: 'drive', subject: 'Surveying', sem: '3rd', link: 'https://drive.google.com/example/surveying-templates' },
    { title: 'Structural Analysis Solved Examples', type: 'pdf', subject: 'Structural Analysis', sem: '5th', link: 'https://drive.google.com/example/structural-analysis-examples.pdf' },
    { title: 'GATE CSE Preparation Roadmap', type: 'website', subject: 'Design & Analysis of Algorithms', sem: '7th', link: 'https://gateoverflow.in' },
    { title: 'AI Ethics Reading List', type: 'notes', subject: 'AI Ethics & Governance', sem: '6th', link: 'https://drive.google.com/example/ai-ethics-reading-list.pdf' }
  ];
  const resourceRows = [];
  for (let i = 0; i < 34; i++) {
    const t = RESOURCE_TEMPLATES[i % RESOURCE_TEMPLATES.length];
    const deptCode = allDeptCodes[i % allDeptCodes.length];
    const uploader = pick(studentsByDept[deptCode]);
    resourceRows.push([t.title, t.type, t.subject, deptIds[deptCode], t.sem, t.link, uploader.id]);
  }
  await pool.query(
    'INSERT INTO resources (title, type, subject, department_id, semester, link, uploaded_by) VALUES ?',
    [resourceRows]
  );
  summary.resources = resourceRows.length;

  console.log('\n✅ Realistic data seeding complete.\n');
  console.log('Summary of records inserted:');
  console.table(summary);

  await pool.end();
}

main().catch(async (err) => {
  console.error('❌ Seeding failed:', err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
