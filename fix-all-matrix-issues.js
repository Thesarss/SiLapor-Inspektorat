const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function fixAllMatrixIssues() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  FIX ALL MATRIX ISSUES                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let connection;

  try {
    // Connect to database
    console.log('📋 Step 1: Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'evaluation_reporting'
    });
    console.log('   ✅ Connected\n');

    // Check latest matrix report
    console.log('📋 Step 2: Checking latest matrix report...');
    const [reports] = await connection.execute(`
      SELECT id, title, target_opd, total_items, uploaded_by
      FROM matrix_reports
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (reports.length === 0) {
      console.log('   ❌ No matrix reports found. Please upload a matrix first.\n');
      return;
    }

    const report = reports[0];
    console.log('   ✅ Found report:');
    console.log(`      Title: ${report.title}`);
    console.log(`      Target OPD: "${report.target_opd}"`);
    console.log(`      Items: ${report.total_items}\n`);

    // Check existing assignments
    console.log('📋 Step 3: Checking existing assignments...');
    const [existingAssignments] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM matrix_assignments
      WHERE matrix_report_id = ?
    `, [report.id]);

    const assignmentCount = existingAssignments[0].count;
    console.log(`   Found ${assignmentCount} existing assignments\n`);

    // Find OPD users with matching institution
    console.log('📋 Step 4: Finding OPD users...');
    const [opdUsers] = await connection.execute(`
      SELECT id, name, username, institution
      FROM users
      WHERE role = 'opd' AND institution = ?
    `, [report.target_opd]);

    console.log(`   ✅ Found ${opdUsers.length} OPD users with institution "${report.target_opd}"\n`);

    if (opdUsers.length === 0) {
      console.log('   ❌ NO OPD USERS FOUND!\n');
      console.log('   Checking all available institutions...\n');
      
      const [allInstitutions] = await connection.execute(`
        SELECT DISTINCT institution
        FROM users
        WHERE role = 'opd' AND institution IS NOT NULL
        ORDER BY institution
      `);

      console.log('   Available institutions:');
      allInstitutions.forEach((inst, i) => {
        console.log(`   ${i + 1}. "${inst.institution}"`);
      });
      console.log('');

      // Try to find similar institution (case-insensitive)
      const targetLower = report.target_opd.toLowerCase().trim();
      const similarInst = allInstitutions.find(inst => 
        inst.institution.toLowerCase().trim() === targetLower
      );

      if (similarInst && similarInst.institution !== report.target_opd) {
        console.log('   ⚠️  Found similar institution with different case!');
        console.log(`      Target: "${report.target_opd}"`);
        console.log(`      Found: "${similarInst.institution}"`);
        console.log('');
        console.log('   🔧 Fixing: Updating matrix report target_opd...');
        
        await connection.execute(`
          UPDATE matrix_reports
          SET target_opd = ?
          WHERE id = ?
        `, [similarInst.institution, report.id]);

        console.log('   ✅ Updated target_opd\n');

        // Re-fetch OPD users with corrected institution
        const [correctedOpdUsers] = await connection.execute(`
          SELECT id, name, username, institution
          FROM users
          WHERE role = 'opd' AND institution = ?
        `, [similarInst.institution]);

        opdUsers.length = 0;
        opdUsers.push(...correctedOpdUsers);
        
        console.log(`   ✅ Now found ${opdUsers.length} OPD users\n`);
      } else {
        console.log('   ❌ No matching institution found.');
        console.log('   Please create OPD users with institution matching target_opd\n');
        return;
      }
    }

    // Create missing assignments
    if (assignmentCount === 0 && opdUsers.length > 0) {
      console.log('📋 Step 5: Creating assignments...');
      
      const { v4: uuidv4 } = require('uuid');
      
      for (const opdUser of opdUsers) {
        const assignmentId = uuidv4();
        await connection.execute(`
          INSERT INTO matrix_assignments (
            id, matrix_report_id, assigned_to, assigned_by, status, assigned_at
          ) VALUES (?, ?, ?, ?, ?, NOW())
        `, [assignmentId, report.id, opdUser.id, report.uploaded_by, 'pending']);

        console.log(`   ✅ Created assignment for ${opdUser.name} (${opdUser.username})`);
      }
      console.log('');
    } else if (assignmentCount > 0) {
      console.log('📋 Step 5: Assignments already exist, skipping creation\n');
    }

    // Verify assignments
    console.log('📋 Step 6: Verifying assignments...');
    const [finalAssignments] = await connection.execute(`
      SELECT ma.*, u.name, u.username, u.institution
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      WHERE ma.matrix_report_id = ?
    `, [report.id]);

    console.log(`   ✅ Total assignments: ${finalAssignments.length}\n`);
    finalAssignments.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name} (${a.username})`);
      console.log(`      Institution: ${a.institution}`);
      console.log(`      Status: ${a.status}`);
      console.log('');
    });

    // Test API endpoint
    console.log('📋 Step 7: Testing API endpoint...');
    try {
      // Login as one of the OPD users
      if (opdUsers.length > 0) {
        const testUser = opdUsers[0];
        console.log(`   Testing with user: ${testUser.username}\n`);

        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
          identifier: testUser.username,
          password: 'password123'
        });

        const token = loginResponse.data.token;
        console.log('   ✅ Login successful\n');

        const assignmentsResponse = await axios.get('http://localhost:3000/api/matrix/assignments', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const assignments = assignmentsResponse.data.data;
        console.log(`   ✅ API returned ${assignments.length} assignments\n`);

        if (assignments.length > 0) {
          console.log('   Assignment details:');
          assignments.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.title}`);
            console.log(`      Status: ${a.status}`);
            console.log(`      Items: ${a.completed_items}/${a.total_items}`);
            console.log('');
          });
        }
      }
    } catch (apiError) {
      console.log('   ⚠️  API test failed (backend might not be running)');
      console.log(`   Error: ${apiError.message}\n`);
    }

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ FIX COMPLETE                                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Summary:');
    console.log(`   - Matrix Report: ${report.title}`);
    console.log(`   - Target OPD: ${report.target_opd}`);
    console.log(`   - OPD Users: ${opdUsers.length}`);
    console.log(`   - Assignments: ${finalAssignments.length}`);
    console.log('');

    console.log('🚀 Next Steps:');
    console.log('   1. Refresh frontend (Ctrl + F5)');
    console.log('   2. Login as OPD user');
    console.log('   3. Go to Matrix page');
    console.log('   4. Assignments should now appear\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAllMatrixIssues();
