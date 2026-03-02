const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testEndpoints() {
  console.log('🧪 Testing Recommendation Approval Endpoints\n');
  
  try {
    // Login as admin/inspektorat
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    // Get all pending reviews
    console.log('2️⃣ Fetching pending reviews...');
    const reviewsResponse = await axios.get(`${API_BASE}/follow-ups/all-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const reviews = reviewsResponse.data.data || [];
    console.log(`✅ Found ${reviews.length} pending reviews\n`);
    
    if (reviews.length === 0) {
      console.log('⚠️ No pending reviews found. Please create some test data first.');
      console.log('\nTo create test data:');
      console.log('1. Login as OPD user');
      console.log('2. Create a report');
      console.log('3. Add followup items');
      console.log('4. Submit recommendations with files');
      return;
    }
    
    // Find a recommendation to test
    const recommendationReview = reviews.find(r => r.review_type === 'recommendation');
    
    if (!recommendationReview) {
      console.log('⚠️ No recommendation reviews found.');
      console.log('Available review types:', reviews.map(r => r.review_type).join(', '));
      return;
    }
    
    console.log('3️⃣ Testing recommendation approval...');
    console.log(`   Recommendation ID: ${recommendationReview.id}`);
    console.log(`   Report: ${recommendationReview.report_title}`);
    console.log(`   From: ${recommendationReview.user_name}\n`);
    
    // Test APPROVE endpoint
    console.log('4️⃣ Testing APPROVE endpoint...');
    console.log(`   POST ${API_BASE}/followup-recommendations/recommendations/${recommendationReview.id}/approve`);
    
    try {
      const approveResponse = await axios.post(
        `${API_BASE}/followup-recommendations/recommendations/${recommendationReview.id}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('✅ APPROVE endpoint SUCCESS!');
      console.log('   Response:', approveResponse.data);
    } catch (error) {
      console.error('❌ APPROVE endpoint FAILED!');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data);
      console.error('   URL:', error.config?.url);
      
      // Try REJECT endpoint instead
      console.log('\n5️⃣ Testing REJECT endpoint...');
      console.log(`   POST ${API_BASE}/followup-recommendations/recommendations/${recommendationReview.id}/reject`);
      
      try {
        const rejectResponse = await axios.post(
          `${API_BASE}/followup-recommendations/recommendations/${recommendationReview.id}/reject`,
          { notes: 'Test rejection from automated test' },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('✅ REJECT endpoint SUCCESS!');
        console.log('   Response:', rejectResponse.data);
      } catch (rejectError) {
        console.error('❌ REJECT endpoint FAILED!');
        console.error('   Status:', rejectError.response?.status);
        console.error('   Error:', rejectError.response?.data);
        console.error('   URL:', rejectError.config?.url);
      }
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testEndpoints();
