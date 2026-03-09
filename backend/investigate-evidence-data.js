const mysql = require('mysql2/promise');
require('dotenv').config();

async function investigateEvidenceData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('INVESTIGATING EVIDENCE DATA');
    console.log('========================================\n');

    // Check total evidence files
    const [totalEvidence] = await connection.query(`
      SELECT COUNT(*) as total FROM evidence_files
    `);
    console.log(`Total evidence files in database: ${totalEvidence[0].total}\n`);

    // Check evidence by matrix report
    const [evidenceByReport] = await connection.query(`
      SELECT 
        mr.title as matrix_title,
        mr.target_opd,
        COUNT(DISTINCT ef.id) as evidence_count,
        COUNT(DISTINCT ef.matrix_item_id) as items_with_evidence,
        COUNT(DISTINCT mi.id) as total_items,
        GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') as uploaded_by_users
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      LEFT JOIN evidence_files ef ON ef.matrix_item_id = mi.id
      LEFT JOIN users u ON ef.uploaded_by = u.id
      GROUP BY mr.id, mr.title, mr.target_opd
      ORDER BY mr.title
    `);

    console.log('Evidence by Matrix Report:');
    console.log('==========================\n');
    evidenceByReport.forEach(report => {
      console.log(`📋 ${report.matrix_title} (${report.target_opd})`);
      console.log(`   Total items: ${report.total_items}`);
      console.log(`   Items with evidence: ${report.items_with_evidence}`);
      console.log(`   Total evidence files: ${report.evidence_count}`);
      console.log(`   Uploaded by: ${report.uploaded_by_users || 'None'}`);
      
      if (report.evidence_count > 0) {
        const avgPerItem = (report.evidence_count / report.items_with_evidence).toFixed(2);
        console.log(`   Average files per item: ${avgPerItem}`);
      }
      console.log('');
    });

    // Check evidence by user
    const [evidenceByUser] = await connection.query(`
      SELECT 
        u.name as user_name,
        u.institution,
        COUNT(DISTINCT ef.id) as evidence_count,
        COUNT(DISTINCT ef.matrix_item_id) as items_with_evidence,
        mr.title as matrix_title
      FROM evidence_files ef
      JOIN users u ON ef.uploaded_by = u.id
      JOIN matrix_items mi ON ef.matrix_item_id = mi.id
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      GROUP BY u.id, u.name, u.institution, mr.id, mr.title
      ORDER BY mr.title, u.name
    `);

    console.log('Evidence by User:');
    console.log('=================\n');
    evidenceByUser.forEach(user => {
      console.log(`👤 ${user.user_name} (${user.institution})`);
      console.log(`   Matrix: ${user.matrix_title}`);
      console.log(`   Evidence files: ${user.evidence_count}`);
      console.log(`   Items with evidence: ${user.items_with_evidence}`);
      console.log('');
    });

    // Check current assignment progress
    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.total_items,
        ma.items_with_evidence,
        ma.progress_percentage,
        u.name as user_name,
        u.institution,
        mr.title as matrix_title,
        mr.target_opd
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      WHERE mr.target_opd = 'Dinas Pendidikan'
      ORDER BY ma.progress_percentage DESC
    `);

    console.log('Current Assignment Progress (Dinas Pendidikan):');
    console.log('===============================================\n');
    assignments.forEach(assignment => {
      console.log(`👤 ${assignment.user_name} (${assignment.institution})`);
      console.log(`   Matrix: ${assignment.matrix_title}`);
      console.log(`   Total items: ${assignment.total_items}`);
      console.log(`   Items with evidence: ${assignment.items_with_evidence}`);
      console.log(`   Progress: ${assignment.progress_percentage}%`);
      
      if (assignment.progress_percentage > 100) {
        console.log(`   ⚠️ OVER 100%!`);
      }
      console.log('');
    });

    // Check for duplicate evidence
    const [duplicates] = await connection.query(`
      SELECT 
        matrix_item_id,
        uploaded_by,
        COUNT(*) as count
      FROM evidence_files
      GROUP BY matrix_item_id, uploaded_by
      HAVING count > 1
    `);

    if (duplicates.length > 0) {
      console.log('⚠️ DUPLICATE EVIDENCE FOUND:');
      console.log('============================\n');
      duplicates.forEach(dup => {
        console.log(`   Item: ${dup.matrix_item_id}, User: ${dup.uploaded_by}, Count: ${dup.count}`);
      });
      console.log('');
    } else {
      console.log('✓ No duplicate evidence found\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

investigateEvidenceData();
