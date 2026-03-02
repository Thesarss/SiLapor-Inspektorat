#!/usr/bin/env node

const axios = require('axios');

async function testMatrixProgressAPI() {
  console.log('🔄 Testing Matrix Progress API...\n');
  
  try {
    // First login to get token
    console.log('1. 🔐 Login as Inspektorat...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'kepala.inspektorat@tanjungpinang.go.id',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test matrix progress endpoint
    console.log('\n2. 📊 Testing /api/matrix/progress...');
    const progressResponse = await axios.get('http://localhost:3000/api/matrix/progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ API Response Status:', progressResponse.status);
    console.log('📋 Response Data:', JSON.stringify(progressResponse.data, null, 2));
    
    if (progressResponse.data.success) {
      console.log(`\n✅ Found ${progressResponse.data.data.length} progress records`);
      progressResponse.data.data.forEach((record, index) => {
        console.log(`\n📊 Record ${index + 1}:`);
        console.log(`   Matrix: ${record.matrix_title}`);
        console.log(`   OPD: ${record.opd_user_name} (${record.opd_institution})`);
        console.log(`   Progress: ${record.progress_percentage}%`);
        console.log(`   Items: ${record.items_with_evidence}/${record.total_items} with evidence`);
        console.log(`   Status: ${record.assignment_status}`);
      });
    } else {
      console.log('❌ API returned error:', progressResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
  }
}

testMatrixProgressAPI();