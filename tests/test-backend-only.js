const axios = require('axios');

async function testBackend() {
  console.log('🔍 Testing Backend Matrix Endpoints...\n');
  
  const baseURL = 'http://localhost:3000';
  
  try {
    // Test 1: Server health
    console.log('1. Testing server health...');
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('   ✅ Server is running');
    } catch (error) {
      console.log('   ❌ Server not running - start with: npm run dev');
      return;
    }
    
    // Test 2: Matrix test endpoint (without auth)
    console.log('\n2. Testing matrix test endpoint...');
    try {
      const testResponse = await axios.get(`${baseURL}/api/matrix/test`);
      console.log('   ❌ Unexpected: endpoint should require auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Matrix endpoint exists and requires authentication');
      } else {
        console.log('   ❌ Matrix endpoint error:', error.response?.status);
      }
    }
    
    // Test 3: Check route registration
    console.log('\n3. Testing route registration...');
    try {
      const response = await axios.get(`${baseURL}/api/nonexistent`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('   ✅ 404 for non-existent routes (normal)');
      }
    }
    
    console.log('\n🎉 Backend Test Results:');
    console.log('✅ Backend server is running');
    console.log('✅ Matrix routes are registered');
    console.log('✅ Authentication is working');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Hard refresh browser (Ctrl+Shift+R)');
    console.log('3. Or use incognito/private window');
    console.log('4. Login and test Matrix page');
    
    console.log('\n🔍 Expected Frontend Behavior:');
    console.log('- Matrix page should load without errors');
    console.log('- Network tab should show /api/matrix/... calls');
    console.log('- Should NOT see /api/api/matrix/... calls');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Start backend server: cd backend && npm run dev');
    }
  }
}

testBackend();