const mysql = require('mysql2/promise');

async function test() {
  const config = {
    host: 'sakura.proxy.rlwy.net',
    user: 'root',
    password: 'AcSmQsKyIVLFUeNeaJoNupoKJqzwgnnc',
    database: 'railway',
    port: 28066,
    ssl: { rejectUnauthorized: false }
  };
  try {
    const conn = await mysql.createConnection(config);
    console.log("Connected.");
    
    const [depts] = await conn.query("SELECT COUNT(*) as count FROM departments");
    console.log("Departments:", depts[0].count);
    
    const [courses] = await conn.query("SELECT COUNT(*) as count FROM courses");
    console.log("Courses:", courses[0].count);

    if (depts[0].count > 0) {
      const [sampleDepts] = await conn.query("SELECT * FROM departments LIMIT 5");
      console.log("Sample departments:", sampleDepts);
    }
    if (courses[0].count > 0) {
      const [sampleCourses] = await conn.query("SELECT * FROM courses LIMIT 5");
      console.log("Sample courses:", sampleCourses);
    }
    
    await conn.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
