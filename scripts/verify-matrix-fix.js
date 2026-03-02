const axios = require('axios');

async function verifyMatrixFix() {
  console.log('🔍 Verifying Matrix Audit Fix...\n');
  
  const baseURL = 'http://localhost:3000';
  let token = null;
  
  try {
    // Step 1: Test basic connectivity
    console.log('1. Testing server connectivity...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('   ✅ Server is running:', healthResponse.data.message);
    
    // Step 2: Login to get token
    console.log('\n2. Testing authentication...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        username: 'inspektorat_kepala',
        password: 'DevSecure2024!@#'
      });
      token = loginResponse.data.token;
      console.log('   ✅ Login successful, token obtained');
    } catch (loginError) {
      console.log('   ⚠️  Login failed, trying with different credentials...');
      // Try with admin credentials
      try {
        const adminLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          username: 'inspektorat1',
          password: 'DevSecure2024!@#'
        });
        token = adminLoginResponse.data.token;
        console.log('   ✅ Admin login successful, token obtained');
      } catch (adminError) {
        console.log('   ❌ Both login attempts failed');
        console.log('   💡 Make sure you have users in database with correct passwords');
        return;
      }
    }
    
    // Step 3: Test Matrix endpoints
    console.log('\n3. Testing Matrix endpoints...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test matrix test endpoint
    try {
      const testResponse = await axios.get(`${baseURL}/api/matrix/test`, { headers });
      console.log('   ✅ /api/matrix/test:', testResponse.data.message);
    } catch (error) {
      console.log('   ❌ /api/matrix/test failed:', error.response?.status, error.response?.data?.error);
    }
    
    // Test institutions endpoint
    try {
      const institutionsResponse = await axios.get(`${baseURL}/api/matrix/institutions`, { headers });
      console.log('   ✅ /api/matrix/institutions:', institutionsResponse.data.count, 'institutions found');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ⚠️  /api/matrix/institutions: 403 (user not Inspektorat - this is normal for OPD users)');
      } else {
        console.log('   ❌ /api/matrix/institutions failed:', error.response?.status, error.response?.data?.error);
      }
    }
    
    // Test reports endpoint
    try {
      const reportsResponse = await axios.get(`${baseURL}/api/matrix/reports`, { headers });
      console.log('   ✅ /api/matrix/reports:', reportsResponse.data.count, 'reports found');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ⚠️  /api/matrix/reports: 403 (user not Inspektorat - this is normal for OPD users)');
      } else {
        console.log('   ❌ /api/matrix/reports failed:', error.response?.status, error.response?.data?.error);
      }
    }
    
    // Test assignments endpoint
    try {
      const assignmentsResponse = await axios.get(`${baseURL}/api/matrix/assignments`, { headers });
      console.log('   ✅ /api/matrix/assignments:', assignmentsResponse.data.count, 'assignments found');
    } catch (error) {
      console.log('   ❌ /api/matrix/assignments failed:', error.response?.status, error.response?.data?.error);
    }
    
    // Test statistics endpoint
    try {
      const statsResponse = await axios.get(`${baseURL}/api/matrix/statistics`, { headers });
      console.log('   ✅ /api/matrix/statistics: OK');
    } catch (error) {
      console.log('   ❌ /api/matrix/statistics failed:', error.response?.status, error.response?.data?.error);
    }
    
    console.log('\n🎉 Matrix endpoints verification completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Hard refresh browser (Ctrl+Shift+R)');
    console.log('3. Or use incognito/private window');
    console.log('4. Test frontend Matrix page');
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure backend server is running: npm run dev');
    }
  }
}

// Run verification
verifyMatrixFix().catch(console.error);