const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function verifyMatrixData() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFY MATRIX DATA IN DATABASE                             ║');
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
    console.log('   ✅ Connected to database:', process.env.DB_NAME || 'evaluation_reporting');

    // Check matrix reports
    console.log('\n📋 Checking matrix reports...');
    const [reports] = await connection.execute(`
      SELECT 
        id, title, uploaded_by, target_opd, 
        original_filename, status, total_items, completed_items,
        created_at
      FROM matrix_reports 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (reports.length === 0) {
      console.log('   ⚠️  No matrix reports found');
    } else {
      console.log(`   ✅ Found ${reports.length} matrix reports (showing latest 5):\n`);
      reports.forEach((report, index) => {
        console.log(`   ${index + 1}. ${report.title}`);
        console.log(`      ├─ ID: ${report.id}`);
        console.log(`      ├─ Target OPD: ${report.target_opd}`);
        console.log(`      ├─ File: ${report.original_filename}`);
        console.log(`      ├─ Status: ${report.status}`);
        console.log(`      ├─ Items: ${report.completed_items}/${report.total_items}`);
        console.log(`      └─ Created: ${report.created_at}`);
        console.log('');
      });
    }

    // Check latest report details
    if (reports.length > 0) {
      const latestReport = reports[0];
      
      // Check matrix items
      console.log('📋 Checking matrix items for latest report...');
      const [items] = await connection.execute(`
        SELECT 
          id, item_number, temuan, penyebab, rekomendasi, 
          status, tindak_lanjut, evidence_filename
        FROM matrix_items 
        WHERE matrix_report_id = ?
        ORDER BY item_number ASC
      `, [latestReport.id]);

      console.log(`   ✅ Found ${items.length} matrix items:\n`);
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. Item #${item.item_number}`);
        console.log(`      ├─ Temuan: ${item.temuan.substring(0, 50)}...`);
        console.log(`      ├─ Penyebab: ${item.penyebab.substring(0, 50)}...`);
        console.log(`      ├─ Rekomendasi: ${item.rekomendasi.substring(0, 50)}...`);
        console.log(`      ├─ Status: ${item.status}`);
        console.log(`      ├─ Tindak Lanjut: ${item.tindak_lanjut || 'Belum ada'}`);
        console.log(`      └─ Evidence: ${item.evidence_filename || 'Belum ada'}`);
        console.log('');
      });

      // Check assignments
      console.log('📋 Checking assignments for latest report...');
      const [assignments] = await connection.execute(`
        SELECT 
          ma.id, ma.status, ma.assigned_at, ma.completed_at,
          u.name as assigned_to_name, u.institution
        FROM matrix_assignments ma
        JOIN users u ON ma.assigned_to = u.id
        WHERE ma.matrix_report_id = ?
        ORDER BY ma.assigned_at DESC
      `, [latestReport.id]);

      console.log(`   ✅ Found ${assignments.length} assignments:\n`);
      assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.assigned_to_name}`);
        console.log(`      ├─ Institution: ${assignment.institution}`);
        console.log(`      ├─ Status: ${assignment.status}`);
        console.log(`      ├─ Assigned: ${assignment.assigned_at}`);
        console.log(`      └─ Completed: ${assignment.completed_at || 'Not yet'}`);
        console.log('');
      });
    }

    // Summary statistics
    console.log('📊 Summary Statistics:');
    const [stats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM matrix_reports) as total_reports,
        (SELECT COUNT(*) FROM matrix_items) as total_items,
        (SELECT COUNT(*) FROM matrix_assignments) as total_assignments,
        (SELECT COUNT(*) FROM matrix_items WHERE status = 'pending') as pending_items,
        (SELECT COUNT(*) FROM matrix_items WHERE status = 'submitted') as submitted_items,
        (SELECT COUNT(*) FROM matrix_items WHERE status = 'approved') as approved_items,
        (SELECT COUNT(*) FROM matrix_items WHERE evidence_filename IS NOT NULL) as items_with_evidence
    `);

    const stat = stats[0];
    console.log(`   ├─ Total Reports: ${stat.total_reports}`);
    console.log(`   ├─ Total Items: ${stat.total_items}`);
    console.log(`   ├─ Total Assignments: ${stat.total_assignments}`);
    console.log(`   ├─ Pending Items: ${stat.pending_items}`);
    console.log(`   ├─ Submitted Items: ${stat.submitted_items}`);
    console.log(`   ├─ Approved Items: ${stat.approved_items}`);
    console.log(`   └─ Items with Evidence: ${stat.items_with_evidence}`);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DATABASE VERIFICATION COMPLETE                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if MySQL is running (XAMPP)');
    console.error('   2. Verify database credentials in backend/.env');
    console.error('   3. Ensure database "evaluation_reporting" exists');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyMatrixData();
