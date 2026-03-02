const axios = require('axios');

async function checkLatestMatrix() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CHECK LATEST MATRIX UPLOAD                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Login
    console.log('📋 Step 1: Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('   ✅ Login successful\n');

    // Get matrix reports
    console.log('📋 Step 2: Fetching matrix reports...');
    const reportsResponse = await axios.get('http://localhost:3000/api/matrix/reports', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const reports = reportsResponse.data.data;
    console.log(`   ✅ Found ${reports.length} matrix reports\n`);

    if (reports.length === 0) {
      console.log('   ⚠️  No matrix reports found. Upload a matrix first.\n');
      return;
    }

    // Show latest 3 reports
    console.log('📊 Latest Matrix Reports:\n');
    reports.slice(0, 3).forEach((report, index) => {
      console.log(`${index + 1}. ${report.title}`);
      console.log(`   ├─ ID: ${report.id}`);
      console.log(`   ├─ Target OPD: ${report.target_opd}`);
      console.log(`   ├─ File: ${report.original_filename}`);
      console.log(`   ├─ Status: ${report.status}`);
      console.log(`   ├─ Items: ${report.completed_items}/${report.total_items}`);
      console.log(`   └─ Created: ${new Date(report.created_at).toLocaleString('id-ID')}`);
      console.log('');
    });

    // Get statistics
    console.log('📋 Step 3: Fetching statistics...');
    const statsResponse = await axios.get('http://localhost:3000/api/matrix/statistics', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const stats = statsResponse.data.data;
    console.log('   ✅ Statistics loaded\n');

    console.log('📊 Matrix Statistics:\n');
    
    if (stats.reports) {
      console.log('Reports by Status:');
      Object.entries(stats.reports).forEach(([status, count]) => {
        console.log(`   ├─ ${status}: ${count}`);
      });
      console.log('');
    }

    if (stats.assignments) {
      console.log('Assignments by Status:');
      Object.entries(stats.assignments).forEach(([status, count]) => {
        console.log(`   ├─ ${status}: ${count}`);
      });
      console.log('');
    }

    if (stats.items) {
      console.log('Items by Status:');
      Object.entries(stats.items).forEach(([status, count]) => {
        console.log(`   ├─ ${status}: ${count}`);
      });
      console.log('');
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MATRIX DATA VERIFICATION COMPLETE                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('💡 Next Steps:');
    console.log('   1. Login to frontend as OPD user');
    console.log('   2. Check Matrix Work page for assignments');
    console.log('   3. Submit tindak lanjut and upload evidence');
    console.log('   4. Login as inspektorat to review submissions\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkLatestMatrix();
