const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAllProgress() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('RESETTING ALL PROGRESS TO ZERO');
    console.log('========================================\n');

    // Reset all assignments to zero progress
    const [result] = await connection.query(`
      UPDATE matrix_assignments
      SET 
        total_items = 0,
        items_with_evidence = 0,
        progress_percentage = 0,
        status = 'pending'
    `);

    console.log(`✅ Reset ${result.affectedRows} assignments to zero progress\n`);

    // Now run the fix to calculate correct values
    console.log('Recalculating correct progress values...\n');

    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.assigned_to,
        ma.matrix_report_id,
        u.name as user_name,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY mr.title, u.name
    `);

    for (const assignment of assignments) {
      // Calculate correct progress for this user
      const [progressResult] = await connection.query(`
        SELECT 
          COUNT(DISTINCT mi.id) as total_items,
          COUNT(DISTINCT CASE 
            WHEN EXISTS (
              SELECT 1 FROM evidence_files ef 
              WHERE ef.matrix_item_id = mi.id 
              AND ef.uploaded_by = ?
            ) THEN mi.id 
          END) as items_with_evidence
        FROM matrix_items mi
        WHERE mi.matrix_report_id = ?
      `, [assignment.assigned_to, assignment.matrix_report_id]);

      const progress = progressResult[0];
      const progressPercentage = progress.total_items > 0
        ? Math.round((progress.items_with_evidence / progress.total_items) * 100 * 100) / 100
        : 0;

      // Update the assignment
      await connection.query(`
        UPDATE matrix_assignments 
        SET 
          total_items = ?,
          items_with_evidence = ?,
          progress_percentage = ?,
          last_activity_at = NOW(),
          status = CASE 
            WHEN ? >= 100 THEN 'completed'
            WHEN ? > 0 THEN 'in_progress'
            ELSE 'pending'
          END
        WHERE id = ?
      `, [
        progress.total_items,
        progress.items_with_evidence,
        progressPercentage,
        progressPercentage,
        progressPercentage,
        assignment.id
      ]);

      console.log(`✓ ${assignment.matrix_title} - ${assignment.user_name}`);
      console.log(`  Total: ${progress.total_items}, Evidence: ${progress.items_with_evidence}, Progress: ${progressPercentage}%`);
    }

    console.log('\n========================================');
    console.log('COMPLETE');
    console.log('========================================');
    console.log('✅ All progress values have been reset and recalculated!');
    console.log('✅ All values should now be correct (0% if no evidence uploaded)');
    console.log('\nPlease restart the backend server to apply changes.');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

resetAllProgress();
