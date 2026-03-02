const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test credentials
const INSPEKTORAT_USER = {
  email: 'admin',
  password: 'password123'
};

const OPD_USER = {
  email: 'user1',
  password: 'password123'
};

let inspektoratToken = '';
let opdToken = '';
let testReportId = '';
let testFollowupItemId = '';
let testRecommendationId = '';

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { identifier: email, password });
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestReport(token) {
  try {
    const response = await axios.post(
      `${API_BASE}/reports`,
      {
        title: 'Test Report for Recommendation Approval',
        description: 'Test report untuk testing approval recommendation',
        institution: 'Test OPD'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.id;
  } catch (error) {
    console.error('❌ Create report failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestFollowupItem(token, reportId) {
  try {
    const response = await axios.post(
      `${API_BASE}/followup-items`,
      {
        report_id: reportId,
        temuan: 'Test Temuan untuk Recommendation',
        penyebab: 'Test Penyebab',
        rekomendasi: 'Test Rekomendasi'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.id;
  } catch (error) {
    console.error('❌ Create followup item failed:', error.response?.data || error.message);
    throw error;
  }
}

async function submitRecommendation(token, followupItemId) {
  try {
    // First, get recommendations for this followup item
    const getResponse = await axios.get(
      `${API_BASE}/followup-recommendations/followup-items/${followupItemId}/recommendations`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    let recommendationId = getResponse.data.data[0]?.id;
    
    if (!recommendationId) {
      // Create a recommendation if it doesn't exist
      const createResponse = await axios.post(
        `${API_BASE}/followup-recommendations/followup-items/${followupItemId}/recommendations`,
        {
          response: 'Test response untuk recommendation'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      recommendationId = createResponse.data.data.id;
    }
    
    // Upload a test file
    const FormData = require('form-data');
    const fs = require('fs');
    const form = new FormData();
    
    // Create a dummy PDF file
    const dummyPdfContent = Buffer.from('%PDF-1.4\nTest PDF Content');
    fs.writeFileSync('test-evidence.pdf', dummyPdfContent);
    
    form.append('files', fs.createReadStream('test-evidence.pdf'));
    
    await axios.post(
      `${API_BASE}/followup-recommendations/recommendations/${recommendationId}/files`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    // Submit the recommendation
    await axios.put(
      `${API_BASE}/followup-recommendations/recommendations/${recommendationId}/response`,
      {
        response: 'Test response yang sudah lengkap dengan file'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    // Clean up
    fs.unlinkSync('test-evidence.pdf');
    
    return recommendationId;
  } catch (error) {
    console.error('❌ Submit recommendation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testApproveRecommendation(token, recommendationId) {
  try {
    console.log(`\n🧪 Testing APPROVE endpoint: POST /followup-recommendations/recommendations/${recommendationId}/approve`);
    
    const response = await axios.post(
      `${API_BASE}/followup-recommendations/recommendations/${recommendationId}/approve`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Approve SUCCESS:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Approve FAILED:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
    console.error('   URL:', error.config?.url);
    return false;
  }
}

async function testRejectRecommendation(token, recommendationId) {
  try {
    console.log(`\n🧪 Testing REJECT endpoint: POST /followup-recommendations/recommendations/${recommendationId}/reject`);
    
    const response = await axios.post(
      `${API_BASE}/followup-recommendations/recommendations/${recommendationId}/reject`,
      {
        notes: 'Test rejection notes'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Reject SUCCESS:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Reject FAILED:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
    console.error('   URL:', error.config?.url);
    return false;
  }
}

async function checkPendingReviews(token) {
  try {
    console.log('\n📋 Checking pending reviews...');
    
    const response = await axios.get(
      `${API_BASE}/follow-ups/all-pending`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Pending reviews:', response.data.data?.length || 0);
    console.log('   Data:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error) {
    console.error('❌ Check pending reviews failed:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting Recommendation Approval Test\n');
  
  try {
    // Step 1: Login as OPD
    console.log('1️⃣ Logging in as OPD...');
    opdToken = await login(OPD_USER.email, OPD_USER.password);
    console.log('✅ OPD logged in');
    
    // Step 2: Login as Inspektorat
    console.log('\n2️⃣ Logging in as Inspektorat...');
    inspektoratToken = await login(INSPEKTORAT_USER.email, INSPEKTORAT_USER.password);
    console.log('✅ Inspektorat logged in');
    
    // Step 3: Create test report
    console.log('\n3️⃣ Creating test report...');
    testReportId = await createTestReport(opdToken);
    console.log('✅ Report created:', testReportId);
    
    // Step 4: Create followup item
    console.log('\n4️⃣ Creating followup item...');
    testFollowupItemId = await createTestFollowupItem(opdToken, testReportId);
    console.log('✅ Followup item created:', testFollowupItemId);
    
    // Step 5: Submit recommendation with file
    console.log('\n5️⃣ Submitting recommendation...');
    testRecommendationId = await submitRecommendation(opdToken, testFollowupItemId);
    console.log('✅ Recommendation submitted:', testRecommendationId);
    
    // Step 6: Check pending reviews
    await checkPendingReviews(inspektoratToken);
    
    // Step 7: Test approve endpoint
    const approveSuccess = await testApproveRecommendation(inspektoratToken, testRecommendationId);
    
    if (!approveSuccess) {
      // If approve failed, try reject
      console.log('\n⚠️ Approve failed, trying reject instead...');
      await testRejectRecommendation(inspektoratToken, testRecommendationId);
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
