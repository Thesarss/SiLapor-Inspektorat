const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixProgressCalculation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('FIXING PROGRESS CALCULATION');
    console.log('========================================\n');

    // Get all assignments
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

    console.log(`Found ${assignments.length} assignments to fix\n`);

    let fixed = 0;
    let unchanged = 0;

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

      if (progressPercentage > 0) {
        fixed++;
      } else {
        unchanged++;
      }
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total assignments: ${assignments.length}`);
    console.log(`With progress: ${fixed}`);
    console.log(`No progress yet: ${unchanged}`);
    console.log('\n✅ All progress calculations have been fixed!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

fixProgressCalculation();
