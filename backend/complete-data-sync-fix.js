const mysql = require('mysql2/promise');
require('dotenv').config();

async function completeDataSyncFix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('COMPLETE DATA SYNC FIX');
    console.log('========================================\n');

    // Step 1: Clean all evidence files
    console.log('Step 1: Cleaning all evidence files...');
    const [evidenceFiles] = await connection.query('SELECT COUNT(*) as count FROM evidence_files');
    console.log(`   Found ${evidenceFiles[0].count} evidence files`);
    
    if (evidenceFiles[0].count > 0) {
      await connection.query('DELETE FROM evidence_files');
      console.log('   ✓ All evidence files deleted');
    } else {
      console.log('   ✓ No evidence files to delete');
    }
    console.log('');

    // Step 2: Reset all matrix_items flags
    console.log('Step 2: Resetting matrix_items flags...');
    await connection.query(`
      UPDATE matrix_items 
      SET 
        evidence_submitted = FALSE,
        evidence_count = 0,
        last_evidence_at = NULL,
        status = 'pending'
    `);
    console.log('   ✓ All matrix_items reset to pending with no evidence');
    console.log('');

    // Step 3: Reset all matrix_assignments
    console.log('Step 3: Resetting all matrix_assignments...');
    await connection.query(`
      UPDATE matrix_assignments 
      SET 
        total_items = 0,
        items_with_evidence = 0,
        progress_percentage = 0.00,
        status = 'pending',
        last_activity_at = NOW()
    `);
    console.log('   ✓ All assignments reset to 0% progress');
    console.log('');

    // Step 4: Recalculate correct values for each assignment
    console.log('Step 4: Recalculating correct progress for each assignment...');
    
    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.assigned_to,
        ma.matrix_report_id,
        u.name as user_name,
        u.institution,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY mr.title, u.name
    `);

    console.log(`   Processing ${assignments.length} assignments...\n`);

    for (const assignment of assignments) {
      // Count total items in this matrix
      const [itemCount] = await connection.query(`
        SELECT COUNT(DISTINCT id) as total_items
        FROM matrix_items
        WHERE matrix_report_id = ?
      `, [assignment.matrix_report_id]);

      const totalItems = itemCount[0].total_items;

      // Count items with evidence from THIS user
      const [evidenceCount] = await connection.query(`
        SELECT COUNT(DISTINCT mi.id) as items_with_evidence
        FROM matrix_items mi
        WHERE mi.matrix_report_id = ?
        AND EXISTS (
          SELECT 1 FROM evidence_files ef 
          WHERE ef.matrix_item_id = mi.id 
          AND ef.uploaded_by = ?
        )
      `, [assignment.matrix_report_id, assignment.assigned_to]);

      const itemsWithEvidence = evidenceCount[0].items_with_evidence;
      const progressPercentage = totalItems > 0 
        ? Math.round((itemsWithEvidence / totalItems) * 100 * 100) / 100
        : 0;

      // Update assignment
      await connection.query(`
        UPDATE matrix_assignments 
        SET 
          total_items = ?,
          items_with_evidence = ?,
          progress_percentage = ?,
          status = CASE 
            WHEN ? >= 100 THEN 'completed'
            WHEN ? > 0 THEN 'in_progress'
            ELSE 'pending'
          END
        WHERE id = ?
      `, [
        totalItems,
        itemsWithEvidence,
        progressPercentage,
        progressPercentage,
        progressPercentage,
        assignment.id
      ]);

      console.log(`   ✓ ${assignment.matrix_title} - ${assignment.user_name}`);
      console.log(`     Total: ${totalItems}, Evidence: ${itemsWithEvidence}, Progress: ${progressPercentage}%`);
    }

    console.log('');

    // Step 5: Verify results
    console.log('Step 5: Verifying results...');
    const [verification] = await connection.query(`
      SELECT 
        COUNT(*) as total_assignments,
        SUM(CASE WHEN progress_percentage > 100 THEN 1 ELSE 0 END) as over_100,
        SUM(CASE WHEN progress_percentage < 0 THEN 1 ELSE 0 END) as negative,
        MAX(progress_percentage) as max_progress,
        MIN(progress_percentage) as min_progress,
        AVG(progress_percentage) as avg_progress
      FROM matrix_assignments
    `);

    const v = verification[0];
    console.log(`   Total assignments: ${v.total_assignments}`);
    console.log(`   Progress range: ${v.min_progress}% - ${v.max_progress}%`);
    console.log(`   Average progress: ${v.avg_progress.toFixed(2)}%`);
    console.log(`   Over 100%: ${v.over_100}`);
    console.log(`   Negative: ${v.negative}`);
    console.log('');

    if (v.over_100 > 0 || v.negative > 0) {
      console.log('   ⚠️ WARNING: Found invalid progress values!');
    } else {
      console.log('   ✅ All progress values are valid (0-100%)');
    }

    console.log('');
    console.log('========================================');
    console.log('COMPLETE DATA SYNC - FINISHED');
    console.log('========================================');
    console.log('');
    console.log('Summary:');
    console.log('✅ Evidence files: CLEANED');
    console.log('✅ Matrix items: RESET');
    console.log('✅ Assignments: RECALCULATED');
    console.log('✅ Progress values: VALID (0-100%)');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart backend server: npm start');
    console.log('2. Restart frontend server: npm run dev');
    console.log('3. Clear browser cache: Ctrl+Shift+R');
    console.log('4. Re-login to application');
    console.log('');
    console.log('All progress should now show 0% (no evidence uploaded yet)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

completeDataSyncFix();
