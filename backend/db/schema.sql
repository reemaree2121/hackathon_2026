-- Freshers Portal Database Schema
-- Run this first to create the database and all tables

CREATE DATABASE IF NOT EXISTS colg_portal;
USE freshers_portal;

-- ============ CORE ============

CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  roll_number VARCHAR(30) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department_id INT,
  course_id INT,
  academic_year VARCHAR(10),
  section VARCHAR(10),
  batch_number VARCHAR(20),
  avatar_url VARCHAR(255) DEFAULT NULL,
  xp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ============ FACULTY ============

CREATE TABLE faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  designation VARCHAR(100) NOT NULL,   -- Professor, Associate Professor, Assistant Professor, HOD, Lab Instructor
  department_id INT NOT NULL,
  subjects_handled VARCHAR(255),       -- comma-separated, matches the style of seniors.skills/clubs
  office_room VARCHAR(50),
  email VARCHAR(150) NOT NULL UNIQUE,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ============ TIMETABLE ============

CREATE TABLE timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  section VARCHAR(10) NOT NULL,
  day_of_week VARCHAR(10) NOT NULL,   -- Monday, Tuesday, ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject VARCHAR(100) NOT NULL,
  faculty VARCHAR(100) NOT NULL,      -- denormalized name, kept for backward compatibility with existing queries
  faculty_id INT,                     -- proper FK link to faculty; nullable so legacy rows without a match still work
  classroom VARCHAR(50) NOT NULL,
  is_lab BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);

-- ============ EVENTS ============

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  poster_url VARCHAR(255),
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(150),
  organizing_club VARCHAR(150),
  eligibility VARCHAR(255),
  prerequisites VARCHAR(255),
  registration_deadline DATETIME,
  total_seats INT NOT NULL DEFAULT 50,
  registered_count INT NOT NULL DEFAULT 0,
  difficulty VARCHAR(20) DEFAULT 'Beginner'   -- Beginner, Intermediate, Advanced
);

CREATE TABLE event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_registration (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ SENIORS / MENTORS ============

CREATE TABLE domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE seniors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  department_id INT,
  academic_year VARCHAR(10),
  domain_id INT,
  skills VARCHAR(255),
  placement_status VARCHAR(100),
  hackathons_won INT DEFAULT 0,
  clubs VARCHAR(255),
  bio TEXT,
  contact_email VARCHAR(150),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- ============ CAMPUS ============

CREATE TABLE campus_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  department VARCHAR(150),
  nearby_facilities VARCHAR(255),
  floor_info VARCHAR(100)
);

-- ============ RESOURCES ============

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  type VARCHAR(50),  -- pdf, notes, pyq, github, youtube, drive, website
  subject VARCHAR(100),
  department_id INT,
  semester VARCHAR(10),
  link VARCHAR(500),
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);


-- ============ AI CHAT HISTORY ============

CREATE TABLE ai_chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ NOTICES ============

CREATE TABLE notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ BOOKS & RESOURCES ============

CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_name VARCHAR(200) NOT NULL,
  subject VARCHAR(150),
  semester VARCHAR(10),
  department_id INT,
  `condition` VARCHAR(50),
  price DECIMAL(10, 2),
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ============ CLUBS ============

CREATE TABLE clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  domain_id INT,
  contact_email VARCHAR(150),
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);
