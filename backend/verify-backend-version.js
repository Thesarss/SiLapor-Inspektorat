const http = require('http');

console.log('========================================');
console.log('VERIFYING BACKEND VERSION');
console.log('========================================\n');

console.log('Testing if backend is running with NEW code...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/matrix/test',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Backend is responding!');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Message: ${response.message}`);
      console.log(`   Timestamp: ${response.timestamp}`);
      console.log('');
      
      const timestamp = new Date(response.timestamp);
      const now = new Date();
      const diff = Math.abs(now - timestamp);
      const minutes = Math.floor(diff / 60000);
      
      console.log(`Backend was last restarted: ${minutes} minutes ago`);
      console.log('');
      
      if (minutes > 10) {
        console.log('⚠️  WARNING: Backend might be using OLD code!');
        console.log('   Please RESTART the backend server:');
        console.log('   1. Stop backend (Ctrl+C)');
        console.log('   2. Run: npm start');
        console.log('');
      } else {
        console.log('✅ Backend appears to be recently restarted');
        console.log('   Should be using NEW code');
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Backend is NOT running!');
  console.error(`   Error: ${error.message}`);
  console.error('');
  console.error('Please start the backend server:');
  console.error('   cd backend');
  console.error('   npm start');
  console.error('');
});

req.on('timeout', () => {
  console.error('❌ Backend request timed out!');
  console.error('   Backend might be stuck or not responding');
  console.error('');
  req.destroy();
});

req.end();
