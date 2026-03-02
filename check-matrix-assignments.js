const axios = require('axios');

async function checkMatrixAssignments() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CHECK MATRIX ASSIGNMENTS                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Login as inspektorat
    console.log('1️⃣ Login as Inspektorat...');
    const inspektoratLogin = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    const inspektoratToken = inspektoratLogin.data.token;
    console.log('   ✅ Inspektorat logged in\n');

    // Get matrix reports
    console.log('2️⃣ Fetching matrix reports...');
    const reportsResponse = await axios.get('http://localhost:3000/api/matrix/reports', {
      headers: { Authorization: `Bearer ${inspektoratToken}` }
    });
    const reports = reportsResponse.data.data;
    console.log(`   ✅ Found ${reports.length} matrix reports\n`);

    if (reports.length === 0) {
      console.log('   ⚠️  No matrix reports found\n');
      return;
    }

    // Show latest report
    const latestReport = reports[0];
    console.log('📊 Latest Matrix Report:');
    console.log(`   Title: ${latestReport.title}`);
    console.log(`   Target OPD: ${latestReport.target_opd}`);
    console.log(`   Status: ${latestReport.status}`);
    console.log(`   Items: ${latestReport.completed_items}/${latestReport.total_items}`);
    console.log(`   Created: ${new Date(latestReport.created_at).toLocaleString('id-ID')}\n`);

    // Login as OPD user
    console.log('3️⃣ Login as OPD Pendidikan user...');
    try {
      const opdLogin = await axios.post('http://localhost:3000/api/auth/login', {
        identifier: 'opd1',
        password: 'password123'
      });
      const opdToken = opdLogin.data.token;
      const opdUser = opdLogin.data.user;
      console.log('   ✅ OPD logged in');
      console.log(`   User: ${opdUser.name}`);
      console.log(`   Institution: ${opdUser.institution}`);
      console.log(`   Role: ${opdUser.role}\n`);

      // Get assignments for OPD
      console.log('4️⃣ Fetching assignments for OPD...');
      const assignmentsResponse = await axios.get('http://localhost:3000/api/matrix/assignments', {
        headers: { Authorization: `Bearer ${opdToken}` }
      });
      const assignments = assignmentsResponse.data.data;
      console.log(`   ✅ Found ${assignments.length} assignments\n`);

      if (assignments.length === 0) {
        console.log('   ❌ NO ASSIGNMENTS FOUND FOR THIS OPD USER!\n');
        console.log('   Possible causes:');
        console.log('   1. Target OPD name mismatch');
        console.log('   2. No users with institution = target OPD');
        console.log('   3. Assignment creation failed\n');
      } else {
        console.log('📋 Assignments:');
        assignments.forEach((assignment, index) => {
          console.log(`\n   ${index + 1}. ${assignment.title}`);
          console.log(`      ├─ Status: ${assignment.status}`);
          console.log(`      ├─ Items: ${assignment.completed_items}/${assignment.total_items}`);
          console.log(`      ├─ Assigned by: ${assignment.assigned_by_name}`);
          console.log(`      └─ Assigned at: ${new Date(assignment.assigned_at).toLocaleString('id-ID')}`);
        });
        console.log('');
      }

      // Check database directly for this user
      console.log('5️⃣ Checking database for assignments...');
      console.log(`   User ID: ${opdUser.id}`);
      console.log(`   Institution: ${opdUser.institution}`);
      console.log(`   Target OPD in report: ${latestReport.target_opd}\n`);

      if (opdUser.institution !== latestReport.target_opd) {
        console.log('   ❌ MISMATCH DETECTED!');
        console.log(`   User institution: "${opdUser.institution}"`);
        console.log(`   Target OPD: "${latestReport.target_opd}"`);
        console.log('   These must match exactly (case-sensitive)\n');
      } else {
        console.log('   ✅ Institution matches target OPD\n');
      }

    } catch (error) {
      console.log('   ❌ OPD login failed');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      console.log('   Try different OPD credentials or check if OPD user exists\n');
    }

    // Check all OPD users with Dinas Pendidikan
    console.log('6️⃣ Checking all OPD users with target institution...');
    // We need to query this through a different endpoint or check manually

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  DIAGNOSIS COMPLETE                                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('💡 Next Steps:');
    console.log('   1. Check if OPD user institution matches target OPD exactly');
    console.log('   2. Check if assignments were created in database');
    console.log('   3. Check frontend MatrixWorkPage for display issues\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkMatrixAssignments();
