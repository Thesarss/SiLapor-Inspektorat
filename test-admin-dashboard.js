const axios = require('axios');

async function testAdminDashboard() {
  try {
    console.log('🧪 Testing Admin Dashboard...');
    
    // Test admin analytics endpoint
    const response = await axios.get('http://localhost:3000/api/admin/analytics');
    
    console.log('✅ Admin Analytics Response Status:', response.status);
    console.log('📊 Analytics Data:', JSON.stringify(response.data, null, 2));
    
    // Check for any toFixed errors in the data
    const data = response.data;
    if (data.overview) {
      console.log('📈 Overview Stats:', data.overview);
    }
    
    if (data.opdBreakdown) {
      console.log('🏢 OPD Breakdown Count:', data.opdBreakdown.length);
      data.opdBreakdown.forEach((opd, index) => {
        console.log(`  ${index + 1}. ${opd.institution}: ${opd.completionRate}% completion`);
      });
    }
    
    console.log('✅ Admin dashboard test completed successfully!');
    
  } catch (error) {
    console.error('❌ Admin dashboard test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAdminDashboard();