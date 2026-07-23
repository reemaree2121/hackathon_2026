/**
 * ============================================================================
 * CHATBOT DATA MODULE (chatbot-data.js)
 * ============================================================================
 * Contains comprehensive college knowledge base, student context, and response
 * intent matching rules for Fallback Mode and AI System Instructions.
 * ============================================================================
 */

export const CollegeData = {
  institution: {
    name: "Apex Institute of Technology & Sciences (AITS)",
    code: "AITS-2026",
    academicYear: "2025-2026",
    semester: "Even Semester (Spring 2026)",
    workingHours: "8:30 AM - 5:30 PM (Mon-Sat)",
    libraryHours: "8:00 AM - 10:00 PM (All Days during Exams)",
    helpline: "+1 (800) 555-AITS / support@apextech.edu"
  },

  defaultStudentProfile: {
    name: "Rahul Sharma",
    studentId: "AITS-2023-CS-089",
    department: "Computer Science & Engineering",
    semester: "6th Semester (Year 3)",
    section: "CS-B",
    mentor: "Dr. Ananya Roy (Cabin: CS-204, Email: ananya.roy@apextech.edu)",
    rollNo: 89,
    cgpa: 8.74,
    hostelStatus: "Hostel Block B, Room 302",
    busRoute: "Route 12 (North Campus Express)"
  },

  attendance: {
    overall: 84.8,
    required: 75.0,
    status: "Eligible for Examinations",
    courses: [
      { code: "CS601", name: "Distributed Systems & Cloud", totalClasses: 42, attended: 37, percentage: 88.1, status: "Good" },
      { code: "CS602", name: "Compiler Design", totalClasses: 40, attended: 29, percentage: 72.5, status: "Warning (<75%)" },
      { code: "CS603", name: "Machine Learning & AI", totalClasses: 45, attended: 42, percentage: 93.3, status: "Excellent" },
      { code: "CS604", name: "Web Application Security", totalClasses: 38, attended: 33, percentage: 86.8, status: "Good" },
      { code: "CS605L", name: "AI & ML Laboratory", totalClasses: 20, attended: 19, percentage: 95.0, status: "Excellent" },
      { code: "CS606L", name: "Cloud Computing Lab", totalClasses: 18, attended: 15, percentage: 83.3, status: "Good" }
    ],
    note: "Attendance in CS602 (Compiler Design) is below 75%. Attend the next 3 consecutive lectures to cross the safety threshold."
  },

  marks: {
    gpa: 8.74,
    midTerm1: [
      { code: "CS601", name: "Distributed Systems", max: 50, scored: 44, grade: "A+" },
      { code: "CS602", name: "Compiler Design", max: 50, scored: 38, grade: "A" },
      { code: "CS603", name: "Machine Learning", max: 50, scored: 48, grade: "O" },
      { code: "CS604", name: "Web Security", max: 50, scored: 41, grade: "A+" }
    ]
  },

  timetable: {
    Monday: [
      { time: "09:00 AM - 10:00 AM", subject: "CS601: Distributed Systems", room: "LT-2", faculty: "Prof. R. V. Kumar" },
      { time: "10:00 AM - 11:00 AM", subject: "CS603: Machine Learning", room: "LT-2", faculty: "Dr. Ananya Roy" },
      { time: "11:15 AM - 01:15 PM", subject: "CS605L: AI & ML Lab", room: "AI Lab 3", faculty: "Dr. Ananya Roy & TAs" },
      { time: "01:15 PM - 02:00 PM", subject: "Lunch Break", room: "Central Cafeteria / Mess", faculty: "-" },
      { time: "02:00 PM - 03:00 PM", subject: "CS602: Compiler Design", room: "LT-2", faculty: "Prof. S. Mehra" },
      { time: "03:00 PM - 04:00 PM", subject: "CS604: Web Security", room: "LT-2", faculty: "Dr. K. Patel" }
    ],
    Tuesday: [
      { time: "09:00 AM - 10:00 AM", subject: "CS602: Compiler Design", room: "LT-2", faculty: "Prof. S. Mehra" },
      { time: "10:00 AM - 11:00 AM", subject: "CS604: Web Security", room: "LT-2", faculty: "Dr. K. Patel" },
      { time: "11:15 AM - 01:15 PM", subject: "CS606L: Cloud Computing Lab", room: "Cloud Lab 1", faculty: "Prof. R. V. Kumar" },
      { time: "02:00 PM - 04:00 PM", subject: "Mentorship & Project Work", room: "CS Seminar Hall", faculty: "Dr. Ananya Roy" }
    ],
    Wednesday: [
      { time: "09:00 AM - 10:00 AM", subject: "CS603: Machine Learning", room: "LT-2", faculty: "Dr. Ananya Roy" },
      { time: "10:00 AM - 11:00 AM", subject: "CS601: Distributed Systems", room: "LT-2", faculty: "Prof. R. V. Kumar" },
      { time: "11:15 AM - 12:15 PM", subject: "Open Elective: Data Analytics", room: "Auditorium B", faculty: "Dr. V. Sharma" },
      { time: "02:00 PM - 04:30 PM", subject: "Placement Aptitude & Soft Skills", room: "Placement Cell", faculty: "Training Div." }
    ],
    Thursday: [
      { time: "09:00 AM - 10:00 AM", subject: "CS604: Web Security", room: "LT-2", faculty: "Dr. K. Patel" },
      { time: "10:00 AM - 11:00 AM", subject: "CS602: Compiler Design", room: "LT-2", faculty: "Prof. S. Mehra" },
      { time: "11:15 AM - 01:15 PM", subject: "Mini Project Phase-2 Review", room: "CS Lab 4", faculty: "Evaluation Panel" }
    ],
    Friday: [
      { time: "09:00 AM - 10:00 AM", subject: "CS601: Distributed Systems", room: "LT-2", faculty: "Prof. R. V. Kumar" },
      { time: "10:00 AM - 11:00 AM", subject: "CS603: Machine Learning", room: "LT-2", faculty: "Dr. Ananya Roy" },
      { time: "11:15 AM - 01:00 PM", subject: "Club Activities & Sports", room: "Sports Complex / Student Hub", faculty: "Dean Welfare" }
    ],
    Saturday: [
      { time: "09:30 AM - 12:30 PM", subject: "Special Expert Webinar / Guest Lecture", room: "Main Auditorium / Online", faculty: "Industry Experts" }
    ],
    Sunday: []
  },

  events: [
    {
      id: "E101",
      title: "InnovateX 2026 36-Hour Hackathon",
      date: "August 12-13, 2026",
      time: "9:00 AM Onwards",
      venue: "Main Campus Auditorium & Tech Block",
      category: "Hackathon",
      organizer: "Coding Club & ACM Student Chapter",
      prizes: "$5,000 Cash Pool + Internship Opportunities",
      description: "Build AI-driven solutions for sustainable smart cities. Free meals and overnight hacker lounge provided."
    },
    {
      id: "E102",
      title: "Annual Tech Symposium & Project Expo",
      date: "August 28, 2026",
      time: "10:00 AM - 5:00 PM",
      venue: "Central Exhibition Grounds",
      category: "Exhibition",
      organizer: "Department of CSE & ECE",
      description: "Showcase final year and pre-final year projects to top industrial sponsors and recruiters."
    },
    {
      id: "E103",
      title: "Campus Cultural Fest 'AURA 2026'",
      date: "September 18-20, 2026",
      time: "5:00 PM - 10:00 PM Daily",
      venue: "Open Air Theatre (OAT)",
      category: "Cultural",
      organizer: "Student Cultural Council",
      description: "3 days of music, dance, battle of bands, fashion show, and live celebrity concert."
    }
  ],

  announcements: [
    {
      id: "N301",
      title: "Mid-Term Examination Datesheet Released",
      date: "July 20, 2026",
      category: "Academic",
      urgent: true,
      content: "Mid-term examinations for 6th semester start on August 18, 2026. Hall tickets available in Student Portal."
    },
    {
      id: "N302",
      title: "Tuition Fee & Hostel Fee Deadline Extension",
      date: "July 18, 2026",
      category: "Finance",
      urgent: false,
      content: "The fee submission deadline for Even Semester has been extended to August 5, 2026 without late fee."
    },
    {
      id: "N303",
      title: "TechCorp Campus Placement Drive Drive-1",
      date: "July 15, 2026",
      category: "Placements",
      urgent: true,
      content: "TechCorp visiting for Software Engineer roles ($18 LPA). Eligible branches: CSE, IT, ECE with CGPA > 7.5."
    }
  ],

  library: {
    status: "Open",
    timings: "8:00 AM - 10:00 PM (Mon-Sat), 9:00 AM - 5:00 PM (Sun)",
    borrowedBooks: [
      { title: "Distributed Systems: Principles and Paradigms", author: "Andrew S. Tanenbaum", dueDate: "August 2, 2026", accessionNo: "LIB-98421" },
      { title: "Pattern Recognition and Machine Learning", author: "Christopher M. Bishop", dueDate: "August 10, 2026", accessionNo: "LIB-44102" }
    ],
    rules: "Students can borrow up to 4 books for 14 days. Fine of $0.50/day applies for overdue books.",
    digitalResources: "IEEE Xplore, ACM Digital Library, SpringerLink available via College Campus Wi-Fi or VPN."
  },

  faculty: [
    { name: "Dr. Ananya Roy", designation: "Associate Professor & HOD CSE", department: "CSE", email: "ananya.roy@apextech.edu", cabin: "CS-204", officeHours: "Tue/Thu 2:00 PM - 4:00 PM" },
    { name: "Prof. R. V. Kumar", designation: "Professor", department: "CSE", email: "rv.kumar@apextech.edu", cabin: "CS-108", officeHours: "Mon/Wed 11:00 AM - 1:00 PM" },
    { name: "Prof. S. Mehra", designation: "Assistant Professor", department: "CSE", email: "s.mehra@apextech.edu", cabin: "CS-112", officeHours: "Mon/Fri 3:00 PM - 4:30 PM" },
    { name: "Dr. K. Patel", designation: "Associate Professor", department: "Cybersecurity", email: "k.patel@apextech.edu", cabin: "CS-301", officeHours: "Wed/Fri 10:00 AM - 12:00 PM" }
  ],

  clubs: [
    { name: "Apex Coding Club (ACC)", focus: "Competitive Programming, Web Dev & Open Source", meeting: "Wednesdays 5:00 PM @ CS Lab 2", lead: "Rohan Verma (Final Year)" },
    { name: "Robotics & Automation Society", focus: "Embedded systems, IoT, Drones & Autonomous Bots", meeting: "Fridays 4:30 PM @ Tinkering Lab", lead: "Siddharth Jain" },
    { name: "AI & Data Science Club", focus: "Kaggle Competitions, LLMs, Computer Vision", meeting: "Thursdays 5:00 PM @ AI Lab 1", lead: "Priya Sundaram" },
    { name: "Literary & Debate Society", focus: "Model UN, Public Speaking & Creative Writing", meeting: "Tuesdays 5:15 PM @ Seminar Hall A", lead: "Aarav Gupta" }
  ],

  placements: {
    stats: "92.4% Placement Rate (2025 Passout Batch)",
    highestPackage: "$45 LPA (Cloud Native Systems)",
    averagePackage: "$11.2 LPA",
    upcomingDrives: [
      { company: "TechCorp Systems", role: "Graduate Software Engineer", package: "$18.0 LPA", driveDate: "August 8, 2026", minCgpa: 7.5 },
      { company: "DataPulse AI", role: "Associate ML Engineer", package: "$22.0 LPA", driveDate: "August 15, 2026", minCgpa: 8.0 },
      { company: "CyberShield Security", role: "Security Analyst", package: "$14.5 LPA", driveDate: "August 22, 2026", minCgpa: 7.0 }
    ]
  },

  campusMap: {
    blocks: [
      { name: "Block A (Admin & Registration)", locations: "Principal Office, Accounts, Registrar, Conference Room" },
      { name: "Block B (Computer Science & AI)", locations: "CS Labs 1-6, AI Center of Excellence, HOD Office (CS-204), Lecture Halls LT-1 to LT-4" },
      { name: "Block C (Electronics & Electrical)", locations: "VLSI Lab, Embedded Systems, Circuit Lab" },
      { name: "Block D (Mechanical & Civil)", locations: "CAD/CAM Lab, Hydraulics, Workshop" },
      { name: "Central Library & Student Activity Center", locations: "Ground & 1st Floor (Library), 2nd Floor (Cafeteria & Indoor Games)" },
      { name: "Hostel Complex", locations: "Block A (Girls Hostel), Block B & C (Boys Hostel), Mess Hall" }
    ]
  },

  faqs: [
    {
      keywords: ["wifi", "internet", "network", "connect"],
      answer: "To connect to campus Wi-Fi ('AITS-Student-5G'), select the network and log in using your Roll Number (e.g. AITS-2023-CS-089) and portal password."
    },
    {
      keywords: ["leave", "permission", "absent", "medical"],
      answer: "Submit a leave application through the Student Portal under 'Requests > Medical/Duty Leave'. Attach supporting doctor certificates or event letters for approval by your Mentor and HOD."
    },
    {
      keywords: ["id card", "identity", "lost id", "reissue"],
      answer: "If you lose your student ID card, report to the Security Office (Admin Block Ground Floor), pay a reissue fee of $10 at Accounts, and submit a passport photo."
    },
    {
      keywords: ["canteen", "cafeteria", "food", "mess"],
      answer: "The Central Cafeteria is open 8:00 AM - 8:30 PM. Breakfast (7:30-9:00), Lunch (12:30-2:30), Snacks (4:30-6:00), Dinner (7:30-9:30)."
    },
    {
      keywords: ["scholarship", "financial aid", "fee waiver"],
      answer: "Merit scholarships (CGPA > 9.0) and Need-based fee waivers are available. Apply via 'Portal > Resources > Scholarships' before August 31."
    }
  ]
};

/**
 * Intelligent Fallback Intent Matching Engine
 * Matches queries against college data when no AI key is active.
 */
export function getFallbackResponse(query, pageContext = "", studentProfile = CollegeData.defaultStudentProfile) {
  const q = query.toLowerCase().trim();
  const userName = studentProfile.name || "Student";
  const first = userName.split(" ")[0];

  // Quick greetings
  if (q.match(/^(hi|hello|hey|greetings|hola|good morning|good afternoon|good evening)/i)) {
    const hour = new Date().getHours();
    let timeGreeting = "Good Day";
    if (hour < 12) timeGreeting = "Good Morning";
    else if (hour < 17) timeGreeting = "Good Afternoon";
    else timeGreeting = "Good Evening";

    return `👋 **${timeGreeting}, ${first}!** Welcome back to Apex Campus AI Assistant.\n\nI can help you with your **Attendance**, **Timetable**, **Events**, **Library**, **Marks**, **Faculty**, and campus services.\n\nWhat would you like to check today?`;
  }

  // Attendance
  if (q.includes("attendance") || q.includes("absent") || q.includes("classes attended") || q.includes("bunk")) {
    const att = CollegeData.attendance;
    let list = att.courses.map(c => `• **${c.code} (${c.name})**: ${c.percentage}% (${c.attended}/${c.totalClasses} classes) - *${c.status}*`).join("\n");
    return `📊 **Attendance Summary for ${userName}**\n\n**Overall Attendance:** **${att.overall}%** (${att.status})\n\n**Course Breakdown:**\n${list}\n\n⚠️ **Notice:** ${att.note}`;
  }

  // Timetable / Next Class
  if (q.includes("timetable") || q.includes("schedule") || q.includes("class") || q.includes("lecture") || q.includes("room")) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[new Date().getDay()] || "Monday";
    const dayToFetch = (q.includes("today") || q.includes("next")) ? (todayName === "Sunday" ? "Monday" : todayName) : "Monday";
    const daySchedule = CollegeData.timetable[dayToFetch] || [];

    if (daySchedule.length === 0) {
      return `📅 **Timetable for ${dayToFetch}**\n\nNo scheduled classes today! Enjoy your weekend or use this time for self-study and project work in the library.`;
    }

    let scheduleList = daySchedule.map(s => `• **${s.time}**\n  📘 **${s.subject}**\n  📍 Location: ${s.room} | 👨‍🏫 ${s.faculty}`).join("\n\n");
    return `🗓️ **${dayToFetch}'s Timetable for ${userName} (${studentProfile.section})**\n\n${scheduleList}`;
  }

  // Marks / Grades / Internal
  if (q.includes("mark") || q.includes("grade") || q.includes("cgpa") || q.includes("score") || q.includes("result") || q.includes("gpa")) {
    const m = CollegeData.marks;
    let markList = m.midTerm1.map(item => `• **${item.code} (${item.name})**: **${item.scored}/${item.max}** (Grade: ${item.grade})`).join("\n");
    return `📈 **Academic Performance & Marks**\n\n**Cumulative GPA:** **${m.gpa} / 10.0**\n\n**Mid-Term 1 Results:**\n${markList}\n\nKeep up the great effort! Your next assessment cycle begins in 3 weeks.`;
  }

  // Events / Hackathon / Fest
  if (q.includes("event") || q.includes("hackathon") || q.includes("fest") || q.includes("workshop") || q.includes("symposium")) {
    let evList = CollegeData.events.map(e => `🎉 **${e.title}**\n  📅 **Date:** ${e.date} (${e.time})\n  📍 **Venue:** ${e.venue}\n  🏆 **Details:** ${e.description}\n`).join("\n");
    return `🌟 **Upcoming Campus Events & Activities**\n\n${evList}\n\nYou can register for any of these events directly from the **Events Tab** in your portal!`;
  }

  // Library / Books
  if (q.includes("library") || q.includes("book") || q.includes("dues") || q.includes("borrow")) {
    const lib = CollegeData.library;
    let books = lib.borrowedBooks.map(b => `• **${b.title}** by *${b.author}*\n  📅 Due Date: **${b.dueDate}** (Acc: ${b.accessionNo})`).join("\n");
    return `📚 **Library Account & Timings**\n\n**Timings:** ${lib.timings}\n\n**Currently Borrowed Books:**\n${books}\n\n💡 **Note:** ${lib.rules}`;
  }

  // Mentor / Faculty / HOD
  if (q.includes("mentor") || q.includes("faculty") || q.includes("teacher") || q.includes("prof") || q.includes("hod")) {
    let facList = CollegeData.faculty.map(f => `• **${f.name}** (${f.designation})\n  📧 Email: ${f.email} | 🚪 Cabin: ${f.cabin}\n  🕒 Office Hours: ${f.officeHours}`).join("\n");
    return `👨‍🏫 **Your Mentor & Faculty Directory**\n\n**Assigned Faculty Mentor:**\n⭐ **${studentProfile.mentor}**\n\n**Department Faculty Contacts:**\n${facList}`;
  }

  // Announcements / Notices
  if (q.includes("announcement") || q.includes("notice") || q.includes("news") || q.includes("update")) {
    let list = CollegeData.announcements.map(a => `📢 **${a.title}** (${a.date})\n  Category: *${a.category}*\n  ${a.content}`).join("\n\n");
    return `🔔 **Latest College Announcements**\n\n${list}`;
  }

  // Clubs / Activities
  if (q.includes("club") || q.includes("society") || q.includes("activity") || q.includes("sports")) {
    let list = CollegeData.clubs.map(c => `🚀 **${c.name}**\n  Focus: ${c.focus}\n  🕒 Meetings: ${c.meeting}\n  👤 Student Lead: ${c.lead}`).join("\n\n");
    return `🏆 **Student Clubs & Societies**\n\n${list}`;
  }

  // Placement / Drive / Job / Internship
  if (q.includes("placement") || q.includes("job") || q.includes("internship") || q.includes("drive") || q.includes("company")) {
    const p = CollegeData.placements;
    let list = p.upcomingDrives.map(d => `• **${d.company}** - ${d.role}\n  💼 Package: **${d.package}** | Date: ${d.driveDate} (Min CGPA: ${d.minCgpa})`).join("\n");
    return `💼 **Campus Placement Cell Updates**\n\n**Batch Statistics:** ${p.stats}\n**Highest Package:** ${p.highestPackage}\n\n**Upcoming Recruitment Drives:**\n${list}`;
  }

  // Campus Map / Location / Where is
  if (q.includes("where is") || q.includes("map") || q.includes("block") || q.includes("building") || q.includes("room")) {
    let list = CollegeData.campusMap.blocks.map(b => `📍 **${b.name}**\n  Contains: ${b.locations}`).join("\n\n");
    return `🗺️ **Campus Map & Location Guide**\n\n${list}`;
  }

  // FAQ matching
  for (const faq of CollegeData.faqs) {
    if (faq.keywords.some(k => q.includes(k))) {
      return `💡 **Information & Assistance**\n\n${faq.answer}`;
    }
  }

  // Page Context specific fallback
  if (pageContext) {
    return `ℹ️ You are currently viewing the **${pageContext}** section.\n\nI can help you review details regarding your ${pageContext.toLowerCase()}, fetch updates, or answer general academic questions for Apex Institute! Try asking:\n• *"Show my timetable for today"*\n• *"What is my attendance percentage?"*\n• *"Who is my mentor?"*`;
  }

  // Default fallback answer
  return `🤖 **Apex Campus AI Assistant**\n\nI can help you look up **Attendance**, **Timetable**, **Internal Marks**, **Events**, **Library Dues**, **Faculty Contacts**, **Placements**, and **Campus Notices**.\n\nTry asking me:\n• *"Where is my next class?"*\n• *"Show my attendance"* \n• *"When is the hackathon?"*\n• *"Who is my mentor?"*`;
}
