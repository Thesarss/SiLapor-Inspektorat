// Test script untuk memverifikasi Matrix Audit endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Warna untuk console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, data = null, description = '') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    };

    if (data) {
      if (data instanceof FormData) {
        config.data = data;
        config.headers['Content-Type'] = 'multipart/form-data';
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    log(`✅ ${method} ${endpoint} - ${description}`, 'green');
    log(`   Status: ${response.status}`, 'blue');
    if (response.data) {
      log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`, 'blue');
    }
    return response.data;
  } catch (error) {
    log(`❌ ${method} ${endpoint} - ${description}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return null;
  }
}

async function runTests() {
  log('\n🚀 Testing Matrix Audit Endpoints\n', 'yellow');

  // Test 1: Health check
  log('--- Test 1: Health Check ---', 'yellow');
  await testEndpoint('GET', '/health', null, 'Server health check');

  // Test 2: Login sebagai Inspektorat
  log('\n--- Test 2: Login as Inspektorat ---', 'yellow');
  const loginResponse = await testEndpoint('POST', '/api/auth/login', {
    identifier: 'inspektorat_kepala',
    password: 'password123'
  }, 'Login as Inspektorat user');

  if (loginResponse && loginResponse.token) {
    authToken = loginResponse.token;
    log('   Token received and saved', 'green');
  } else {
    log('   ⚠️  Login failed, trying with different credentials', 'yellow');
    // Try alternative credentials
    const altLogin = await testEndpoint('POST', '/api/auth/login', {
      identifier: 'admin',
      password: 'admin123'
    }, 'Login as Admin user');
    
    if (altLogin && altLogin.token) {
      authToken = altLogin.token;
      log('   Token received from admin login', 'green');
    }
  }

  if (!authToken) {
    log('\n❌ Cannot proceed without authentication token', 'red');
    log('Please ensure you have a user with role "inspektorat" or "super_admin"', 'yellow');
    return;
  }

  // Test 3: Test endpoint
  log('\n--- Test 3: Matrix Test Endpoint ---', 'yellow');
  await testEndpoint('GET', '/api/matrix/test', null, 'Test if matrix API is working');

  // Test 4: Get institutions
  log('\n--- Test 4: Get Institutions ---', 'yellow');
  await testEndpoint('GET', '/api/matrix/institutions', null, 'Get available institutions');

  // Test 5: Get reports
  log('\n--- Test 5: Get Matrix Reports ---', 'yellow');
  await testEndpoint('GET', '/api/matrix/reports', null, 'Get matrix reports for Inspektorat');

  // Test 6: Get statistics
  log('\n--- Test 6: Get Statistics ---', 'yellow');
  await testEndpoint('GET', '/api/matrix/statistics', null, 'Get matrix statistics');

  // Test 7: Get assignments (will fail for Inspektorat, but endpoint should exist)
  log('\n--- Test 7: Get Assignments ---', 'yellow');
  await testEndpoint('GET', '/api/matrix/assignments', null, 'Get matrix assignments (OPD endpoint)');

  log('\n✅ All endpoint tests completed!\n', 'green');
  log('Summary:', 'yellow');
  log('- If all endpoints return 200 or 403 (forbidden), the routes are working', 'blue');
  log('- 404 errors indicate missing routes', 'blue');
  log('- 500 errors indicate server/database issues', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
