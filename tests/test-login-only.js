const http = require('http');

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLogin() {
  console.log('🔍 Testing Different Login Combinations\n');
  
  const users = [
    { identifier: 'admin', passwords: ['admin', 'password', 'secret', 'admin123', 'password123'] },
    { identifier: 'inspektorat_kepala', passwords: ['secret', 'password', 'admin', 'inspektorat'] },
    { identifier: 'inspektorat1', passwords: ['secret', 'password', 'admin', 'inspektorat'] }
  ];
  
  for (const user of users) {
    console.log(`Testing user: ${user.identifier}`);
    
    for (const password of user.passwords) {
      try {
        const loginData = { identifier: user.identifier, password: password };
        const response = await makeRequest('POST', '/api/auth/login', loginData);
        
        if (response.status === 200) {
          console.log(`   ✅ SUCCESS: ${user.identifier} / ${password}`);
          console.log(`   Token: ${response.data.token ? 'YES' : 'NO'}`);
          console.log(`   User: ${response.data.user?.name || 'Unknown'}`);
          console.log(`   Role: ${response.data.user?.role || 'Unknown'}`);
          return { user: user.identifier, password, token: response.data.token };
        } else {
          console.log(`   ❌ ${user.identifier} / ${password}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${user.identifier} / ${password}: ERROR`);
      }
    }
    console.log('');
  }
  
  console.log('❌ No successful login found');
  return null;
}

testLogin();