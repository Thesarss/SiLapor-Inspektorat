const http = require('http');

console.log('========================================');
console.log('TESTING /api/matrix/progress ENDPOINT');
console.log('========================================\n');

// You need to get a valid token first by logging in
// For now, let's just test if the endpoint responds

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/matrix/assignments',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
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
      console.log(`Status: ${res.statusCode}\n`);
      
      if (response.success && response.data) {
        console.log(`Found ${response.data.length} assignments:\n`);
        
        response.data.forEach((assignment, index) => {
          console.log(`${index + 1}. ${assignment.title || 'No title'}`);
          console.log(`   Progress: ${assignment.progress_percentage}%`);
          console.log(`   Total items: ${assignment.total_items}`);
          console.log(`   Items with evidence: ${assignment.items_with_evidence || 0}`);
          console.log(`   Status: ${assignment.status}`);
          
          if (assignment.progress_percentage > 100) {
            console.log(`   ⚠️ OVER 100%!`);
          }
          console.log('');
        });
        
        const over100 = response.data.filter(a => a.progress_percentage > 100);
        if (over100.length > 0) {
          console.log(`⚠️ WARNING: ${over100.length} assignments have progress over 100%!`);
        } else {
          console.log(`✅ All assignments have valid progress (<= 100%)`);
        }
      } else {
        console.log('Response:', JSON.stringify(response, null, 2));
      }
      
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.on('timeout', () => {
  console.error('❌ Request timed out');
  req.destroy();
});

req.end();
