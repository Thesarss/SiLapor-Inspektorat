const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function debugOPDAssignments() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DEBUG OPD ASSIGNMENTS                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let connection;

  try {
    // Connect to database
    console.log('📋 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'evaluation_reporting'
    });
    console.log('   ✅ Connected\n');

    // Check latest matrix report
    console.log('1️⃣ Checking latest matrix report...');
    const [reports] = await connection.execute(`
      SELECT id, title, target_opd, total_items, created_at
      FROM matrix_reports
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (reports.length === 0) {
      console.log('   ❌ No matrix reports found\n');
      return;
    }

    const report = reports[0];
    console.log('   ✅ Latest report:');
    console.log(`      Title: ${report.title}`);
    console.log(`      Target OPD: "${report.target_opd}"`);
    console.log(`      Items: ${report.total_items}`);
    console.log(`      Created: ${report.created_at}\n`);

    // Check assignments for this report
    console.log('2️⃣ Checking assignments for this report...');
    const [assignments] = await connection.execute(`
      SELECT ma.*, u.name, u.username, u.institution
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      WHERE ma.matrix_report_id = ?
    `, [report.id]);

    console.log(`   ✅ Found ${assignments.length} assignments:\n`);
    if (assignments.length > 0) {
      assignments.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.name} (${a.username})`);
        console.log(`      Institution: "${a.institution}"`);
        console.log(`      Status: ${a.status}`);
        console.log('');
      });
    } else {
      console.log('   ❌ NO ASSIGNMENTS CREATED!\n');
    }

    // Check all OPD users with matching institution
    console.log('3️⃣ Checking OPD users with matching institution...');
    const [opdUsers] = await connection.execute(`
      SELECT id, name, username, institution, role
      FROM users
      WHERE role = 'opd' AND institution = ?
    `, [report.target_opd]);

    console.log(`   ✅ Found ${opdUsers.length} OPD users with institution "${report.target_opd}":\n`);
    if (opdUsers.length > 0) {
      opdUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} (${u.username})`);
        console.log(`      Institution: "${u.institution}"`);
        console.log('');
      });
    } else {
      console.log('   ❌ NO OPD USERS FOUND WITH THIS INSTITUTION!\n');
      console.log('   This is why assignments were not created.\n');
    }

    // Check all OPD users to see available institutions
    console.log('4️⃣ Checking all OPD users and their institutions...');
    const [allOPD] = await connection.execute(`
      SELECT DISTINCT institution
      FROM users
      WHERE role = 'opd' AND institution IS NOT NULL
      ORDER BY institution
    `);

    console.log('   ✅ Available OPD institutions in database:\n');
    allOPD.forEach((inst, i) => {
      console.log(`   ${i + 1}. "${inst.institution}"`);
    });
    console.log('');

    // Check for institution name mismatch
    console.log('5️⃣ Checking for institution name mismatch...');
    const targetOPD = report.target_opd.toLowerCase().trim();
    const matchingInst = allOPD.find(inst => 
      inst.institution.toLowerCase().trim() === targetOPD
    );

    if (matchingInst) {
      console.log('   ✅ Exact match found (case-insensitive)');
      console.log(`      Target: "${report.target_opd}"`);
      console.log(`      Match: "${matchingInst.institution}"`);
      
      if (report.target_opd !== matchingInst.institution) {
        console.log('   ⚠️  WARNING: Case mismatch detected!');
        console.log('      Database uses case-sensitive comparison');
        console.log(`      "${report.target_opd}" !== "${matchingInst.institution}"`);
      }
    } else {
      console.log('   ❌ NO MATCH FOUND!');
      console.log(`      Target OPD: "${report.target_opd}"`);
      console.log('      This institution does not exist in users table');
    }
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  DIAGNOSIS SUMMARY                                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    if (assignments.length === 0 && opdUsers.length === 0) {
      console.log('❌ PROBLEM: No assignments created because no OPD users found\n');
      console.log('SOLUTION:');
      console.log('1. Check target OPD name in matrix upload');
      console.log(`   Current: "${report.target_opd}"`);
      console.log('2. Make sure it matches exactly with institution in users table');
      console.log('3. Available institutions:');
      allOPD.forEach(inst => console.log(`   - "${inst.institution}"`));
      console.log('');
      console.log('FIX OPTIONS:');
      console.log('A. Update matrix report target_opd to match existing institution');
      console.log('B. Update user institution to match target_opd');
      console.log('C. Create new OPD user with correct institution\n');
    } else if (assignments.length > 0) {
      console.log('✅ Assignments created successfully!\n');
      console.log('If OPD user cannot see assignments:');
      console.log('1. Check if user is logging in with correct credentials');
      console.log('2. Check if user institution matches assignment');
      console.log('3. Check frontend /matrix/assignments endpoint');
      console.log('4. Check browser console for errors\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugOPDAssignments();
