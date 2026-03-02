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
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
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

async function testMatrixDirect() {
  console.log('🔍 Testing Matrix Endpoints Directly\n');
  
  try {
    // Step 1: Test health
    console.log('1. Testing server health...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}`);
    if (health.status !== 200) {
      console.log('   ❌ Server not healthy');
      return;
    }
    console.log('   ✅ Server healthy');
    
    // Step 2: Test matrix test endpoint (should require auth)
    console.log('\n2. Testing /api/matrix/test (no auth)...');
    const testNoAuth = await makeRequest('GET', '/api/matrix/test');
    console.log(`   Status: ${testNoAuth.status}`);
    console.log(`   Response: ${JSON.stringify(testNoAuth.data)}`);
    
    // Step 3: Try to login
    console.log('\n3. Attempting login...');
    const loginData = {
      identifier: 'admin',
      password: 'password123'
    };
    
    const loginResponse = await makeRequest('POST', '/api/auth/login', loginData);
    console.log(`   Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      const token = loginResponse.data.token;
      console.log('   ✅ Login successful, got token');
      
      // Step 4: Test matrix endpoints with auth
      console.log('\n4. Testing matrix endpoints with auth...');
      
      const authHeaders = { 'Authorization': `Bearer ${token}` };
      
      // Test /api/matrix/test
      const testAuth = await makeRequest('GET', '/api/matrix/test', null, authHeaders);
      console.log(`   /api/matrix/test: ${testAuth.status}`);
      console.log(`   Response: ${JSON.stringify(testAuth.data)}`);
      
      // Test /api/matrix/institutions
      const institutions = await makeRequest('GET', '/api/matrix/institutions', null, authHeaders);
      console.log(`   /api/matrix/institutions: ${institutions.status}`);
      if (institutions.status === 200) {
        console.log(`   Institutions found: ${institutions.data.count}`);
      } else {
        console.log(`   Error: ${JSON.stringify(institutions.data)}`);
      }
      
      // Test /api/matrix/reports
      const reports = await makeRequest('GET', '/api/matrix/reports', null, authHeaders);
      console.log(`   /api/matrix/reports: ${reports.status}`);
      if (reports.status === 200) {
        console.log(`   Reports found: ${reports.data.count}`);
      } else {
        console.log(`   Error: ${JSON.stringify(reports.data)}`);
      }
      
    } else {
      console.log('   ❌ Login failed');
      console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
      
      // Try alternative login
      console.log('\n   Trying alternative login...');
      const altLogin = {
        identifier: 'admin',
        password: 'secret'
      };
      
      const altResponse = await makeRequest('POST', '/api/auth/login', altLogin);
      console.log(`   Alt Login Status: ${altResponse.status}`);
      if (altResponse.status !== 200) {
        console.log(`   Alt Response: ${JSON.stringify(altResponse.data)}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testMatrixDirect();