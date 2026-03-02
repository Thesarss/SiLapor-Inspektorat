const axios = require('./backend/node_modules/axios');

async function verifyBackend() {
  console.log('🔍 Verifying Backend Status\n');

  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Backend is running');
    console.log('   Status:', healthResponse.data.status);
    console.log('   Uptime:', Math.floor(healthResponse.data.uptime), 'seconds');
    console.log('   Environment:', healthResponse.data.environment);
    console.log('   Version:', healthResponse.data.version);
    console.log('');

    // Test matrix endpoint
    console.log('2️⃣ Testing matrix test endpoint...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    const token = loginResponse.data.token;

    const matrixTestResponse = await axios.get('http://localhost:3000/api/matrix/test', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Matrix API is accessible');
    console.log('   Message:', matrixTestResponse.data.message);
    console.log('   User:', matrixTestResponse.data.user);
    console.log('');

    // Test institutions endpoint
    console.log('3️⃣ Testing institutions endpoint...');
    const institutionsResponse = await axios.get('http://localhost:3000/api/matrix/institutions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Institutions endpoint working');
    console.log('   Count:', institutionsResponse.data.count);
    console.log('   Institutions:', institutionsResponse.data.data);
    console.log('');

    console.log('✅ All backend endpoints are working correctly!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Make sure backend console is visible');
    console.log('   2. Try uploading a matrix file from the frontend');
    console.log('   3. Watch the backend console for detailed logs');
    console.log('   4. Look for logs starting with 🚀, 📦, ✅, or ❌');

  } catch (error) {
    console.error('❌ Backend verification failed!');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend is not running on http://localhost:3000');
      console.error('   Please start the backend with: npm run dev');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.error('');
    console.error('📋 Troubleshooting:');
    console.error('   1. Check if backend is running: npm run dev');
    console.error('   2. Check if port 3000 is available');
    console.error('   3. Check backend console for errors');
    console.error('   4. Verify .env file configuration');
  }
}

verifyBackend();
