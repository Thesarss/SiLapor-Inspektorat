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

async function testAllUsers() {
  console.log('🔍 Testing Matrix Access for All User Types\n');
  
  // Test users from different roles
  const testUsers = [
    // Inspektorat users
    { identifier: 'inspektorat_kepala', role: 'inspektorat', passwords: ['password123', 'secret', 'admin', 'inspektorat'] },
    { identifier: 'inspektorat1', role: 'inspektorat', passwords: ['password123', 'secret', 'admin'] },
    { identifier: 'inspektorat_staff2', role: 'inspektorat', passwords: ['password123', 'secret', 'admin'] },
    
    // OPD users
    { identifier: 'pendidikan_staff1', role: 'opd', passwords: ['password123', 'secret', 'admin', 'opd'] },
    { identifier: 'kesehatan_staff2', role: 'opd', passwords: ['password123', 'secret', 'admin', 'opd'] },
    { identifier: 'pu_staff2', role: 'opd', passwords: ['password123', 'secret', 'admin', 'opd'] },
    
    // Admin
    { identifier: 'admin', role: 'super_admin', passwords: ['password123'] }
  ];
  
  const successfulLogins = [];
  
  for (const user of testUsers) {
    console.log(`Testing ${user.role}: ${user.identifier}`);
    
    let loginSuccess = false;
    let userToken = null;
    let userData = null;
    
    for (const password of user.passwords) {
      try {
        const loginData = { identifier: user.identifier, password: password };
        const response = await makeRequest('POST', '/api/auth/login', loginData);
        
        if (response.status === 200 && response.data.token) {
          console.log(`   ✅ Login: ${password}`);
          loginSuccess = true;
          userToken = response.data.token;
          userData = response.data.user;
          successfulLogins.push({ 
            identifier: user.identifier, 
            password, 
            role: userData.role,
            name: userData.name,
            token: userToken 
          });
          break;
        }
      } catch (error) {
        // Continue to next password
      }
    }
    
    if (!loginSuccess) {
      console.log(`   ❌ No successful login found`);
    }
    
    // Test matrix access if login successful
    if (loginSuccess && userToken) {
      console.log(`   Testing matrix access...`);
      const authHeaders = { 'Authorization': `Bearer ${userToken}` };
      
      try {
        // Test matrix test endpoint
        const testResponse = await makeRequest('GET', '/api/matrix/test', null, authHeaders);
        console.log(`   Matrix test: ${testResponse.status}`);
        
        // Test appropriate endpoints based on role
        if (userData.role === 'inspektorat' || userData.role === 'super_admin') {
          // Test inspektorat endpoints
          const institutionsResponse = await makeRequest('GET', '/api/matrix/institutions', null, authHeaders);
          const reportsResponse = await makeRequest('GET', '/api/matrix/reports', null, authHeaders);
          
          console.log(`   Institutions: ${institutionsResponse.status} (${institutionsResponse.data.count || 0} found)`);
          console.log(`   Reports: ${reportsResponse.status} (${reportsResponse.data.count || 0} found)`);
        } else if (userData.role === 'opd') {
          // Test OPD endpoints
          const assignmentsResponse = await makeRequest('GET', '/api/matrix/assignments', null, authHeaders);
          console.log(`   Assignments: ${assignmentsResponse.status} (${assignmentsResponse.data.count || 0} found)`);
        }
        
      } catch (error) {
        console.log(`   ❌ Matrix test failed: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('📋 SUMMARY - Successful Logins:');
  console.log('='.repeat(50));
  
  if (successfulLogins.length === 0) {
    console.log('❌ No successful logins found!');
    console.log('💡 This means there might be a password issue in the database.');
  } else {
    successfulLogins.forEach(login => {
      console.log(`✅ ${login.identifier} (${login.role})`);
      console.log(`   Password: ${login.password}`);
      console.log(`   Name: ${login.name}`);
      console.log('');
    });
    
    console.log('🎯 RECOMMENDED TEST USERS:');
    
    const inspektoratUser = successfulLogins.find(u => u.role === 'inspektorat' || u.role === 'super_admin');
    const opdUser = successfulLogins.find(u => u.role === 'opd');
    
    if (inspektoratUser) {
      console.log(`📋 For Matrix Upload (Inspektorat):`);
      console.log(`   Username: ${inspektoratUser.identifier}`);
      console.log(`   Password: ${inspektoratUser.password}`);
    }
    
    if (opdUser) {
      console.log(`📝 For Matrix Work (OPD):`);
      console.log(`   Username: ${opdUser.identifier}`);
      console.log(`   Password: ${opdUser.password}`);
    }
  }
}

testAllUsers();