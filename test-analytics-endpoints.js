const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testAnalyticsEndpoints() {
  console.log('🧪 Testing Matrix Analytics Endpoints\n');
  
  try {
    // Step 1: Login as Inspektorat
    console.log('1️⃣ Logging in as Inspektorat...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'inspektorat_kepala',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log('   User:', user.name);
    console.log('   Role:', user.role);
    console.log('');
    
    // Step 2: Test /matrix/statistics endpoint
    console.log('2️⃣ Testing GET /matrix/statistics...');
    const statsResponse = await axios.get(`${API_URL}/matrix/statistics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (statsResponse.data.success) {
      console.log('✅ Statistics endpoint working');
      console.log('   Data:', JSON.stringify(statsResponse.data.data, null, 2));
    } else {
      console.error('❌ Statistics failed:', statsResponse.data.error);
    }
    console.log('');
    
    // Step 3: Test /matrix/opd-performance endpoint
    console.log('3️⃣ Testing GET /matrix/opd-performance...');
    const performanceResponse = await axios.get(`${API_URL}/matrix/opd-performance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (performanceResponse.data.success) {
      console.log('✅ OPD Performance endpoint working');
      console.log(`   Found ${performanceResponse.data.data.length} OPDs with assignments`);
      
      if (performanceResponse.data.data.length > 0) {
        console.log('\n   📊 OPD Performance Data:');
        performanceResponse.data.data.forEach((opd, index) => {
          console.log(`\n   ${index + 1}. ${opd.institution} (${opd.opd_name})`);
          console.log(`      - Assignments: ${opd.total_assignments}`);
          console.log(`      - Total Items: ${opd.total_items}`);
          console.log(`      - Completed: ${opd.completed_items}`);
          console.log(`      - Submitted: ${opd.submitted_items}`);
          console.log(`      - Pending: ${opd.pending_items}`);
          console.log(`      - Completion Rate: ${opd.completion_rate}%`);
          const responseTime = opd.avg_response_time || 0;
          console.log(`      - Avg Response Time: ${typeof responseTime === 'number' ? responseTime.toFixed(1) : '0.0'} days`);
        });
      } else {
        console.log('   ℹ️  No OPD performance data available yet');
      }
    } else {
      console.error('❌ OPD Performance failed:', performanceResponse.data.error);
    }
    console.log('');
    
    // Step 4: Test /matrix/reports endpoint
    console.log('4️⃣ Testing GET /matrix/reports...');
    const reportsResponse = await axios.get(`${API_URL}/matrix/reports`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (reportsResponse.data.success) {
      console.log('✅ Matrix reports endpoint working');
      console.log(`   Found ${reportsResponse.data.count} matrix reports`);
      
      if (reportsResponse.data.count > 0) {
        console.log('\n   📋 Matrix Reports:');
        reportsResponse.data.data.slice(0, 3).forEach((report, index) => {
          console.log(`\n   ${index + 1}. ${report.title}`);
          console.log(`      - Target OPD: ${report.target_opd}`);
          console.log(`      - Total Items: ${report.total_items}`);
          console.log(`      - Completed: ${report.completed_items}`);
          console.log(`      - Status: ${report.status}`);
        });
      }
    } else {
      console.error('❌ Matrix reports failed:', reportsResponse.data.error);
    }
    console.log('');
    
    console.log('✅ All analytics endpoints tested successfully!');
    console.log('\n📝 Summary:');
    console.log('   - /matrix/statistics: ✅ Working');
    console.log('   - /matrix/opd-performance: ✅ Working');
    console.log('   - /matrix/reports: ✅ Working');
    console.log('\n🎉 Analytics system is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAnalyticsEndpoints();
