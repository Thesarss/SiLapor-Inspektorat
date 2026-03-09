const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProgressCalculation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('CHECKING PROGRESS CALCULATION');
    console.log('========================================\n');

    // Get all assignments
    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.matrix_report_id,
        ma.assigned_to,
        ma.total_items,
        ma.items_with_evidence,
        ma.progress_percentage,
        u.name as user_name,
        u.institution,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY mr.title, u.name
    `);

    console.log(`Found ${assignments.length} assignments\n`);

    for (const assignment of assignments) {
      console.log(`\n📋 ${assignment.matrix_title} - ${assignment.user_name} (${assignment.institution})`);
      console.log(`   Assignment ID: ${assignment.id}`);
      console.log(`   Current stored values:`);
      console.log(`   - Total items: ${assignment.total_items}`);
      console.log(`   - Items with evidence: ${assignment.items_with_evidence}`);
      console.log(`   - Progress: ${assignment.progress_percentage}%`);

      // Calculate what it SHOULD be (current logic - WRONG)
      const [wrongCalc] = await connection.query(`
        SELECT 
          COUNT(mi.id) as total_items,
          COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) as items_with_evidence,
          ROUND((COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) / COUNT(mi.id)) * 100, 2) as progress_percentage
        FROM matrix_assignments ma
        JOIN matrix_items mi ON mi.matrix_report_id = ma.matrix_report_id
        WHERE ma.id = ?
      `, [assignment.id]);

      console.log(`   Current calculation (WRONG - counts ALL items in report):`);
      console.log(`   - Total items: ${wrongCalc[0].total_items}`);
      console.log(`   - Items with evidence: ${wrongCalc[0].items_with_evidence}`);
      console.log(`   - Progress: ${wrongCalc[0].progress_percentage}%`);

      // Check how many items in the report
      const [reportItems] = await connection.query(`
        SELECT COUNT(*) as count
        FROM matrix_items
        WHERE matrix_report_id = ?
      `, [assignment.matrix_report_id]);

      console.log(`   Total items in report: ${reportItems[0].count}`);

      // Check how many evidence files uploaded by THIS user
      const [userEvidence] = await connection.query(`
        SELECT COUNT(DISTINCT ef.matrix_item_id) as items_with_evidence
        FROM evidence_files ef
        WHERE ef.uploaded_by = ?
        AND ef.matrix_item_id IN (
          SELECT id FROM matrix_items WHERE matrix_report_id = ?
        )
      `, [assignment.assigned_to, assignment.matrix_report_id]);

      console.log(`   Evidence uploaded by this user: ${userEvidence[0].items_with_evidence} items`);

      // Calculate correct progress
      const correctProgress = reportItems[0].count > 0 
        ? Math.round((userEvidence[0].items_with_evidence / reportItems[0].count) * 100)
        : 0;

      console.log(`   CORRECT progress should be: ${correctProgress}%`);

      if (assignment.progress_percentage !== correctProgress) {
        console.log(`   ⚠️ MISMATCH! Stored: ${assignment.progress_percentage}%, Should be: ${correctProgress}%`);
      }
    }

    console.log('\n========================================');
    console.log('PROBLEM IDENTIFIED');
    console.log('========================================');
    console.log('The current calculation counts ALL items in the report,');
    console.log('not just the items that THIS user has uploaded evidence for.');
    console.log('');
    console.log('If 5 users are assigned to the same report, and each uploads');
    console.log('evidence for different items, the progress can exceed 100%!');
    console.log('');
    console.log('Example:');
    console.log('- Report has 24 items');
    console.log('- User A uploads evidence for 5 items');
    console.log('- User B uploads evidence for 5 items');
    console.log('- User C uploads evidence for 5 items');
    console.log('- Total evidence_submitted = 15 items');
    console.log('- Progress = 15/24 * 100 = 62.5% for EACH user');
    console.log('');
    console.log('But if they upload for the SAME items:');
    console.log('- 5 users upload evidence for the same 5 items');
    console.log('- Total evidence_submitted could be counted 5x');
    console.log('- Progress = 25/24 * 100 = 104% (WRONG!)');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

checkProgressCalculation();
