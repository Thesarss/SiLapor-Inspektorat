// Test script untuk menguji fitur slide down rekomendasi
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testRecommendationSlideDown() {
  console.log('🔍 Testing Recommendation Slide Down Feature...\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Get reports
    console.log('\n2. Getting reports...');
    const reportsResponse = await axios.get(`${API_BASE}/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const reports = reportsResponse.data.data || [];
    console.log(`📊 Total reports: ${reports.length}`);
    
    if (reports.length === 0) {
      console.log('❌ No reports found. Please run import first.');
      return;
    }

    const report = reports[0];
    console.log(`\n� Report: "${report.title}"`);

    // Step 3: Get followup items
    console.log('\n3. Getting followup items...');
    const followupResponse = await axios.get(`${API_BASE}/followup-items/report/${report.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const followupItems = followupResponse.data.data || [];
    console.log(`📋 Followup items found: ${followupItems.length}`);

    if (followupItems.length === 0) {
      console.log('❌ No followup items found.');
      return;
    }

    // Step 4: Test recommendations for each followup item
    for (let i = 0; i < followupItems.length; i++) {
      const item = followupItems[i];
      console.log(`\n4.${i + 1} Testing recommendations for followup item ${i + 1}:`);
      console.log(`   - ID: ${item.id}`);
      console.log(`   - Temuan: "${item.temuan.substring(0, 60)}..."`);
      console.log(`   - Status: ${item.status}`);

      try {
        // Get recommendations for this followup item
        const recResponse = await axios.get(`${API_BASE}/followup-items/${item.id}/recommendations`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const recommendations = recResponse.data.data || [];
        console.log(`   - Recommendations found: ${recommendations.length}`);

        if (recommendations.length === 0) {
          console.log('   ⚠️ No individual recommendations found. This might be expected for existing data.');
          
          // Show the combined rekomendasi from the followup item
          const rekomendasiList = item.rekomendasi.split('\n\n');
          console.log(`   - Combined rekomendasi has ${rekomendasiList.length} parts:`);
          rekomendasiList.forEach((rec, index) => {
            console.log(`     ${index + 1}. "${rec.substring(0, 80)}..."`);
          });
        } else {
          // Show individual recommendations
          recommendations.forEach((rec, index) => {
            console.log(`\n     Recommendation ${index + 1}:`);
            console.log(`     - ID: ${rec.id}`);
            console.log(`     - Text: "${rec.recommendation_text.substring(0, 80)}..."`);
            console.log(`     - Index: ${rec.recommendation_index}`);
            console.log(`     - Status: ${rec.status}`);
            console.log(`     - Files: ${rec.files ? rec.files.length : 0}`);
            
            if (rec.opd_response) {
              console.log(`     - OPD Response: "${rec.opd_response.substring(0, 50)}..."`);
            }
          });
        }
      } catch (error) {
        console.error(`   ❌ Error getting recommendations: ${error.response?.data?.error || error.message}`);
      }
    }

    // Step 5: Login as user1 to test OPD functionality
    console.log('\n5. Testing OPD user functionality...');
    try {
      const user1Login = await axios.post(`${API_BASE}/auth/login`, {
        email: 'user1@example.com',
        password: 'password123'
      });
      
      const user1Token = user1Login.data.token;
      console.log('✅ User1 login successful');

      // Get user1's reports
      const user1ReportsResponse = await axios.get(`${API_BASE}/dashboard/my-reports`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      
      const user1Reports = user1ReportsResponse.data.data || [];
      console.log(`📊 User1 reports: ${user1Reports.length}`);

      if (user1Reports.length > 0) {
        const userReport = user1Reports[0];
        console.log(`\n📋 User1 Report: "${userReport.title}"`);

        // Get followup items for user1's report
        const userFollowupResponse = await axios.get(`${API_BASE}/followup-items/report/${userReport.id}`, {
          headers: { Authorization: `Bearer ${user1Token}` }
        });
        
        const userFollowupItems = userFollowupResponse.data.data || [];
        console.log(`📋 User1 followup items: ${userFollowupItems.length}`);

        if (userFollowupItems.length > 0) {
          const userItem = userFollowupItems[0];
          
          // Test getting recommendations
          try {
            const userRecResponse = await axios.get(`${API_BASE}/followup-items/${userItem.id}/recommendations`, {
              headers: { Authorization: `Bearer ${user1Token}` }
            });
            
            const userRecommendations = userRecResponse.data.data || [];
            console.log(`📋 User1 can access ${userRecommendations.length} recommendations`);

            if (userRecommendations.length > 0) {
              const testRec = userRecommendations[0];
              console.log(`\n🧪 Testing recommendation interaction:`);
              console.log(`   - Recommendation ID: ${testRec.id}`);
              console.log(`   - Status: ${testRec.status}`);
              console.log(`   - Can user interact: ${testRec.status === 'pending' ? 'YES' : 'NO'}`);
            }
          } catch (error) {
            console.error(`   ❌ Error accessing recommendations as user1: ${error.response?.data?.error || error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error testing user1 functionality: ${error.response?.data?.error || error.message}`);
    }

    console.log('\n✅ Recommendation slide down test completed!');
    console.log('\n📝 Summary:');
    console.log('- Individual recommendations should be created when new imports are processed');
    console.log('- Existing followup items will show combined rekomendasi until new imports are made');
    console.log('- Users should be able to expand/collapse each recommendation');
    console.log('- Each recommendation should have its own file upload and status');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testRecommendationSlideDown();