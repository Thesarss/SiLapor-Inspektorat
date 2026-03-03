/**
 * Debug script to check review data
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function debugReviewData() {
  console.log('🔍 Debugging Review Data...\n');

  try {
    // Login as inspektorat
    console.log('1️⃣  Logging in as Inspektorat...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'inspektorat_kepala@tanjungpinang.go.id',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Get all pending reviews
    console.log('2️⃣  Fetching all pending reviews...');
    const reviewsResponse = await axios.get(`${API_URL}/follow-ups/all-pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📊 API Response Status:', reviewsResponse.status);
    console.log('📊 API Response:', JSON.stringify(reviewsResponse.data, null, 2));

    if (reviewsResponse.data.success) {
      const reviews = reviewsResponse.data.data;
      console.log(`\n✅ Found ${reviews.length} reviews\n`);

      if (reviews.length === 0) {
        console.log('⚠️  No reviews found in database');
        console.log('\n🔍 Checking individual tables...\n');

        // Check follow_ups
        console.log('3️⃣  Checking follow_ups table...');
        const followUpsCheck = await axios.get(`${API_URL}/follow-ups/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Follow-ups pending:', followUpsCheck.data.data?.length || 0);

        // Check matrix items
        console.log('4️⃣  Checking matrix items...');
        try {
          const matrixCheck = await axios.get(`${API_URL}/matrix/statistics`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('   Matrix stats:', JSON.stringify(matrixCheck.data.data, null, 2));
        } catch (err) {
          console.log('   Matrix check failed:', err.message);
        }

      } else {
        console.log('📋 Review Details:\n');
        reviews.forEach((review, index) => {
          console.log(`Review #${index + 1}:`);
          console.log(`  Type: ${review.review_type}`);
          console.log(`  ID: ${review.id}`);
          console.log(`  Status: ${review.status}`);
          console.log(`  Title: ${review.report_title || review.matrix_title || 'N/A'}`);
          console.log(`  User: ${review.user_name}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ API returned error:', reviewsResponse.data.error);
    }

    // Check pending count
    console.log('\n5️⃣  Checking pending count...');
    const countResponse = await axios.get(`${API_URL}/follow-ups/admin/pending-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Pending count:', countResponse.data.data.count);

    // Check pending details
    console.log('\n6️⃣  Checking pending details...');
    const detailsResponse = await axios.get(`${API_URL}/follow-ups/admin/pending-details`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Pending details:', JSON.stringify(detailsResponse.data.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

debugReviewData();
