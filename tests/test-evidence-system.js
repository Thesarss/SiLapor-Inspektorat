const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testEvidenceSystem() {
  try {
    console.log('🔐 Testing login...');
    
    // Login as inspektorat user
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'inspektorat_kepala',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }
    
    console.log('✅ Login successful');
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    
    if (!token) {
      console.error('❌ No token found in response');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test evidence categories
    console.log('\n📂 Testing evidence categories...');
    const categoriesResponse = await axios.get(`${BASE_URL}/evidence/meta/categories`, { headers });
    console.log('Categories response:', categoriesResponse.data);
    
    // Test evidence tags
    console.log('\n🏷️ Testing evidence tags...');
    const tagsResponse = await axios.get(`${BASE_URL}/evidence/meta/tags`, { headers });
    console.log('Tags response:', tagsResponse.data);
    
    // Test evidence search
    console.log('\n🔍 Testing evidence search...');
    const searchResponse = await axios.get(`${BASE_URL}/evidence/search`, { headers });
    console.log('Search response:', searchResponse.data);
    
    // Test performance dashboard (if super admin)
    console.log('\n📊 Testing performance dashboard...');
    try {
      const performanceResponse = await axios.get(`${BASE_URL}/performance/dashboard`, { headers });
      console.log('Performance response:', performanceResponse.data);
    } catch (error) {
      console.log('Performance dashboard access denied (expected for non-super-admin)');
    }
    
    console.log('\n✅ Evidence system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEvidenceSystem();