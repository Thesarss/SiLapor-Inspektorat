const mysql = require('./backend/node_modules/mysql2/promise');
const bcrypt = require('./backend/node_modules/bcrypt');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

async function autoFixDatabase() {
  console.log('🔧 Auto Fix Database\n');

  let connection;

  try {
    // Connect
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'evaluation_reporting'
    });

    console.log('✅ Connected to database\n');

    // Step 1: Get latest matrix report
    console.log('📋 Step 1: Checking matrix report...');
    const [reports] = await connection.execute(`
      SELECT id, title, target_opd, uploaded_by
      FROM matrix_reports
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (reports.length === 0) {
      console.log('   ⚠️  No matrix reports found\n');
      return;
    }

    const report = reports[0];
    console.log(`   Report: "${report.title}"`);
    console.log(`   Target: "${report.target_opd}"\n`);

    // Step 2: Check/fix institution name
    console.log('📋 Step 2: Checking institution match...');
    const [opdUsers] = await connection.execute(`
      SELECT id, name, username FROM users WHERE role = 'opd' AND institution = ?
    `, [report.target_opd]);

    console.log(`   Found ${opdUsers.length} OPD users\n`);

    if (opdUsers.length === 0) {
      // Try case-insensitive match
      const [allInst] = await connection.execute(`
        SELECT DISTINCT institution FROM users WHERE role = 'opd' ORDER BY institution
      `);

      const targetLower = report.target_opd.toLowerCase().trim();
      const match = allInst.find(i => i.institution.toLowerCase().trim() === targetLower);

      if (match && match.institution !== report.target_opd) {
        console.log(`   🔧 Fixing institution name mismatch...`);
        console.log(`      From: "${report.target_opd}"`);
        console.log(`      To: "${match.institution}"`);

        await connection.execute(`
          UPDATE matrix_reports SET target_opd = ? WHERE id = ?
        `, [match.institution, report.id]);

        console.log('   ✅ Fixed\n');

        // Re-fetch users
        const [newUsers] = await connection.execute(`
          SELECT id, name, username FROM users WHERE role = 'opd' AND institution = ?
        `, [match.institution]);

        opdUsers.length = 0;
        opdUsers.push(...newUsers);
      } else {
        // Create OPD user if none exists
        console.log('   ⚠️  No matching institution found');
        console.log('   🔧 Creating OPD user...\n');

        const { v4: uuidv4 } = require('./backend/node_modules/uuid');
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash('password123', 10);

        await connection.execute(`
          INSERT INTO users (id, name, username, email, password, role, institution, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          userId,
          `User OPD ${report.target_opd}`,
          `opd_${report.target_opd.toLowerCase().replace(/\s+/g, '_')}`,
          `opd.${report.target_opd.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          hashedPassword,
          'opd',
          report.target_opd
        ]);

        console.log('   ✅ Created OPD user');
        console.log(`      Username: opd_${report.target_opd.toLowerCase().replace(/\s+/g, '_')}`);
        console.log('      Password: password123\n');

        opdUsers.push({ id: userId, name: `User OPD ${report.target_opd}`, username: `opd_${report.target_opd.toLowerCase().replace(/\s+/g, '_')}` });
      }
    }

    // Step 3: Create assignments
    console.log('📋 Step 3: Creating assignments...');
    const [existingAssignments] = await connection.execute(`
      SELECT COUNT(*) as count FROM matrix_assignments WHERE matrix_report_id = ?
    `, [report.id]);

    if (existingAssignments[0].count === 0 && opdUsers.length > 0) {
      const { v4: uuidv4 } = require('./backend/node_modules/uuid');

      for (const user of opdUsers) {
        await connection.execute(`
          INSERT INTO matrix_assignments (id, matrix_report_id, assigned_to, assigned_by, status, assigned_at)
          VALUES (?, ?, ?, ?, 'pending', NOW())
        `, [uuidv4(), report.id, user.id, report.uploaded_by]);

        console.log(`   ✅ Created for ${user.name}`);
      }
      console.log('');
    } else if (existingAssignments[0].count > 0) {
      console.log(`   ✅ ${existingAssignments[0].count} assignments already exist\n`);
    }

    // Step 4: Verify
    console.log('📋 Step 4: Verification...');
    const [finalAssignments] = await connection.execute(`
      SELECT ma.id, u.name, u.username, u.institution
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      WHERE ma.matrix_report_id = ?
    `, [report.id]);

    console.log(`   ✅ Total assignments: ${finalAssignments.length}\n`);
    finalAssignments.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.name} (${a.username})`);
      console.log(`      Institution: ${a.institution}`);
    });
    console.log('');

    console.log('✅ Database fix complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

autoFixDatabase();
