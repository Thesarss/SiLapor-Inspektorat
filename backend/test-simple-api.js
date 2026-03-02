#!/usr/bin/env node

const axios = require('axios');

async function testSimpleAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🔄 Testing simple API connection...\n');
  
  try {
    // Test root endpoint
    console.log('1. Testing root endpoint...');
    const rootResponse = await axios.get(baseURL);
    console.log('✅ Root endpoint response:', rootResponse.status);
    
  } catch (error) {
    console.error('❌ Connection Error:', error.code || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Backend tidak running atau port salah');
      console.log('   - Cek apakah backend running di port 3000');
      console.log('   - Jalankan: cd backend && npm run dev');
    } else if (error.response) {
      console.log('✅ Backend responding with status:', error.response.status);
      console.log('   - Backend is running');
      console.log('   - Response:', error.response.data);
    }
  }
}

testSimpleAPI();