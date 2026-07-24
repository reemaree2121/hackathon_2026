const mysql = require('mysql2/promise');

const config = {
  host: 'sakura.proxy.rlwy.net',
  port: 28066,
  user: 'root',
  password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
};

async function seed() {
  const conn = await mysql.createConnection(config);
  console.log('✅ Connected to Railway!');

  // Insert departments
  await conn.query(`INSERT IGNORE INTO departments (id, name) VALUES 
    (1,'Computer Science'),(2,'Electronics'),(3,'Mechanical'),(4,'Civil'),(5,'Business Administration')`);

  // Insert domains
  await conn.query(`INSERT IGNORE INTO domains (id, name) VALUES 
    (1,'Web Development'),(2,'Data Science'),(3,'Machine Learning'),(4,'Mobile Development'),
    (5,'Cybersecurity'),(6,'Cloud Computing'),(7,'UI/UX Design'),(8,'DevOps')`);

  // Insert seniors
  await conn.query(`INSERT IGNORE INTO seniors (id, name, department_id, domain_id, academic_year, skills, bio, hackathons_won, placement_status, contact_email) VALUES
    (1,'Reema Sherin',1,3,3,'Python,TensorFlow,ML,Deep Learning','Passionate about AI and machine learning. Won multiple hackathons building ML models.',4,'Placed at Google','reemasherin66@gmail.com'),
    (2,'Arjun Nair',1,1,4,'React,Node.js,MongoDB,Docker','Full stack developer with 3 years of experience building scalable web applications.',3,'Placed at Microsoft','crybaby2653@gmail.com'),
    (3,'Priya Menon',2,2,3,'Python,R,SQL,Tableau,Power BI','Data scientist specializing in business intelligence and predictive analytics.',2,'Placed at Amazon','reemasherin53@gmail.com'),
    (4,'Rahul Kumar',1,5,4,'Network Security,Ethical Hacking,Python,Linux','Cybersecurity expert who has secured multiple enterprise systems.',5,'Placed at Infosys','halltvmarsa@gmail.com'),
    (5,'Sneha Pillai',1,7,3,'Figma,Adobe XD,User Research,Prototyping','UI/UX designer with a passion for accessible and beautiful product design.',1,'Placed at Flipkart','sneha.pillai@gmail.com'),
    (6,'Aditya Sharma',3,6,4,'AWS,Azure,Kubernetes,Terraform,CI/CD','Cloud architect helping startups scale their infrastructure efficiently.',3,'Placed at TCS','aditya.sharma@gmail.com'),
    (7,'Kavya Reddy',5,2,3,'Python,SQL,Business Analytics,Excel','Business analyst bridging the gap between data and decision making.',2,'Placed at Deloitte','kavya.reddy@gmail.com'),
    (8,'Mohammed Farhan',1,4,4,'Flutter,Dart,React Native,Firebase','Mobile developer who has published 5 apps on Play Store with 50k+ downloads.',3,'Placed at Zoho','farhan.dev@gmail.com')`);

  // Insert clubs (using domain_id instead of category)
  await conn.query(`INSERT IGNORE INTO clubs (id, name, description, domain_id, contact_email) VALUES
    (1,'Tech Wizards','Premier coding and technology club',1,'techwizards@college.edu'),
    (2,'AI/ML Society','Explore artificial intelligence and machine learning',3,'aiml@college.edu'),
    (3,'Design Hub','Creative design and UI/UX community',7,'designhub@college.edu'),
    (4,'Debate Club','Sharpen your communication and argumentation skills',NULL,'debate@college.edu'),
    (5,'Robotics Club','Build and program robots',NULL,'robotics@college.edu')`);

  // Insert campus locations (using correct schema columns: department, nearby_facilities, floor_info)
  await conn.query(`INSERT IGNORE INTO campus_locations (id, name, description, department, nearby_facilities, floor_info) VALUES
    (1,'Main Library','Central library with 50000+ books','All','Cafeteria','Floor 1'),
    (2,'Computer Lab 1','Advanced computing lab with 60 systems','Computer Science','Restrooms','Floor 2'),
    (3,'Cafeteria','Main canteen serving breakfast and lunch','All','Main Library','Floor 1'),
    (4,'Auditorium','1200 seat main auditorium','All','Parking','Floor 1'),
    (5,'Sports Complex','Indoor and outdoor sports facilities','All','Gym','Ground'),
    (6,'Medical Center','24/7 student health center','Admin','Hostels','Floor 1')`);

  console.log('✅ Departments, Domains, Seniors, Clubs, Campus locations inserted!');

  const [rows] = await conn.query('SELECT COUNT(*) as count FROM seniors');
  console.log(`✅ Total seniors in DB: ${rows[0].count}`);

  await conn.end();
  console.log('\n🎉 Database fully seeded and ready!');
}

seed().catch(console.error);
