const http = require('http');

async function testRegister() {
  const payload = JSON.stringify({
    fullName: 'Test User',
    email: 'test' + Math.floor(Math.random() * 100000) + '@gmail.com',
    password: 'Password123',
    departmentId: '1',
    courseId: '',
    academicYear: '1st',
    section: 'A',
    batchNumber: '2026-30'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response Body:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(payload);
  req.end();
}

testRegister();
