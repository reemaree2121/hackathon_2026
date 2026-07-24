const http = require('http');

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', err => reject(err));
    req.write(dataStr);
    req.end();
  });
}

async function run() {
  const rollNumber = 'TEST_ROLL_' + Math.floor(Math.random() * 100000);
  const email = 'test_email_' + Math.floor(Math.random() * 100000) + '@gmail.com';
  const password = 'Password123';

  console.log(`Registering user with Roll Number: ${rollNumber}, Email: ${email}`);
  const regResult = await post('/api/register', {
    fullName: 'Test Roll User',
    rollNumber,
    email,
    password,
    departmentId: '1',
    courseId: '',
    academicYear: '1st',
    section: 'A',
    batchNumber: '2026-30'
  });
  console.log('Registration Status:', regResult.status);
  console.log('Registration Response:', regResult.body);

  if (regResult.status !== 201) {
    console.error('Registration failed!');
    return;
  }

  console.log('\n1. Testing login using EMAIL...');
  const loginEmailResult = await post('/api/login', { email: email, password });
  console.log('Login Status:', loginEmailResult.status);
  console.log('Login Response:', loginEmailResult.body);

  console.log('\n2. Testing login using ROLL NUMBER (USN)...');
  const loginRollResult = await post('/api/login', { email: rollNumber, password });
  console.log('Login Status:', loginRollResult.status);
  console.log('Login Response:', loginRollResult.body);

  console.log('\n3. Testing registration with the same roll number (should fail with 409)...');
  const dupResult = await post('/api/register', {
    fullName: 'Duplicate Roll User',
    rollNumber,
    email: 'other_email_' + Math.floor(Math.random() * 100000) + '@gmail.com',
    password,
    departmentId: '1',
    courseId: '',
    academicYear: '1st',
    section: 'A',
    batchNumber: '2026-30'
  });
  console.log('Dup Status:', dupResult.status);
  console.log('Dup Response:', dupResult.body);
}

run().catch(console.error);
