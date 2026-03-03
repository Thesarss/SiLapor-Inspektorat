const axios = require('axios');

async function testAllPendingAPI() {
  try {
    console.log('🔄 Testing /api/follow-ups/all-pending endpoint...\n');
    
    // First, login to get token
    console.log('1️⃣ Logging in as Inspektorat...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    if (!token) {
      throw new Error('No token received from login');
    }
    console.log('✅ Login successful, token received\n');
    
    // Now call the all-pending endpoint
    console.log('2️⃣ Calling /api/follow-ups/all-pending...');
    const response = await axios.get('http://localhost:3000/api/follow-ups/all-pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    console.log('\n📊 Total items:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 Items breakdown:');
      const breakdown = {};
      response.data.data.forEach(item => {
        breakdown[item.review_type] = (breakdown[item.review_type] || 0) + 1;
      });
      console.log(breakdown);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
  }
}

testAllPendingAPI();
