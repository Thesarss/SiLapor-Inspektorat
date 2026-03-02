#!/usr/bin/env node

const axios = require('axios');

async function testApprovalAPI() {
  try {
    console.log('🧪 Testing Approval API...');
    
    // First, login to get a token
    console.log('1. Logging in as inspektorat...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat_kepala',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test all-pending endpoint
    console.log('2. Testing all-pending reviews endpoint...');
    const allPendingResponse = await axios.get('http://localhost:3000/api/follow-ups/all-pending', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ All-pending API Response:');
    console.log('Status:', allPendingResponse.status);
    console.log('Success:', allPendingResponse.data.success);
    
    if (allPendingResponse.data.success) {
      const reviews = allPendingResponse.data.data;
      console.log('📊 Pending Reviews:');
      console.log('- Total:', reviews.length);
      
      if (reviews.length > 0) {
        const breakdown = {};
        reviews.forEach(review => {
          breakdown[review.review_type] = (breakdown[review.review_type] || 0) + 1;
        });
        
        console.log('📋 Breakdown by type:');
        Object.entries(breakdown).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });
        
        console.log('📋 Sample reviews:');
        reviews.slice(0, 3).forEach((review, index) => {
          console.log(`   ${index + 1}. ${review.review_type}: ${review.report_title || review.matrix_title || review.original_filename || 'Unknown'}`);
        });
      }
    } else {
      console.error('❌ API returned error:', allPendingResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testApprovalAPI();