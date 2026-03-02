const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function quickFix() {
  console.log('🔧 Quick Fix Matrix Issues\n');

  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'evaluation_reporting'
    });

    console.log('✅ Connected to database\n');

    // Get latest report
    const [reports] = await connection.execute(`
      SELECT id, title, target_opd, uploaded_by
      FROM matrix_reports
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (reports.length === 0) {
      console.log('❌ No reports found\n');
      return;
    }

    const report = reports[0];
    console.log(`📊 Report: ${report.title}`);
    console.log(`   Target: "${report.target_opd}"\n`);

    // Check assignments
    const [assignments] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM matrix_assignments
      WHERE matrix_report_id = ?
    `, [report.id]);

    console.log(`📋 Assignments: ${assignments[0].count}\n`);

    // Check OPD users
    const [opdUsers] = await connection.execute(`
      SELECT id, name, username, institution
      FROM users
      WHERE role = 'opd' AND institution = ?
    `, [report.target_opd]);

    console.log(`👥 OPD Users with "${report.target_opd}": ${opdUsers.length}\n`);

    if (opdUsers.length > 0) {
      opdUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.username})`);
      });
      console.log('');
    }

    // If no users, check all institutions
    if (opdUsers.length === 0) {
      console.log('⚠️  No users found. Checking all institutions...\n');
      
      const [allInst] = await connection.execute(`
        SELECT DISTINCT institution
        FROM users
        WHERE role = 'opd'
        ORDER BY institution
      `);

      console.log('Available institutions:');
      allInst.forEach(i => console.log(`   - "${i.institution}"`));
      console.log('');

      // Try case-insensitive match
      const targetLower = report.target_opd.toLowerCase();
      const match = allInst.find(i => i.institution.toLowerCase() === targetLower);

      if (match && match.institution !== report.target_opd) {
        console.log(`🔧 Found match with different case: "${match.institution}"`);
        console.log('   Updating report...\n');

        await connection.execute(`
          UPDATE matrix_reports
          SET target_opd = ?
          WHERE id = ?
        `, [match.institution, report.id]);

        console.log('✅ Updated!\n');

        // Re-fetch users
        const [newUsers] = await connection.execute(`
          SELECT id FROM users WHERE role = 'opd' AND institution = ?
        `, [match.institution]);

        opdUsers.length = 0;
        opdUsers.push(...newUsers);
      }
    }

    // Create assignments if needed
    if (assignments[0].count === 0 && opdUsers.length > 0) {
      console.log('📝 Creating assignments...\n');

      const { v4: uuidv4 } = require('uuid');

      for (const user of opdUsers) {
        await connection.execute(`
          INSERT INTO matrix_assignments (id, matrix_report_id, assigned_to, assigned_by, status, assigned_at)
          VALUES (?, ?, ?, ?, 'pending', NOW())
        `, [uuidv4(), report.id, user.id, report.uploaded_by]);

        console.log(`   ✅ Created for user ID: ${user.id}`);
      }

      console.log('\n✅ All assignments created!\n');
    } else if (assignments[0].count > 0) {
      console.log('✅ Assignments already exist\n');
    }

    console.log('🎉 Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

quickFix();
