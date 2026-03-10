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
    console.log('FIX PROGRESS CALCULATION');
    console.log('========================================\n');

    // Step 1: Get all assignments that need progress recalculation
    console.log('📋 Getting all assignments...');
    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.assigned_to,
        ma.matrix_report_id,
        ma.progress_percentage as old_progress,
        u.name as user_name,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY ma.progress_percentage DESC
    `);

    console.log(`Found ${assignments.length} assignments to recalculate\n`);

    // Step 2: Recalculate progress for each assignment
    for (const assignment of assignments) {
      console.log(`🔄 Recalculating: ${assignment.user_name} - ${assignment.matrix_title}`);
      console.log(`   Assignment ID: ${assignment.id}`);
      console.log(`   Old progress: ${assignment.old_progress}%`);

      // Manual calculation using the fixed query
      const [progressResult] = await connection.query(`
        SELECT 
          COUNT(DISTINCT mi.id) as total_items,
          COUNT(DISTINCT CASE WHEN ef.id IS NOT NULL THEN mi.id END) as items_with_evidence
        FROM matrix_items mi
        LEFT JOIN evidence_files ef ON ef.matrix_item_id = mi.id AND ef.uploaded_by = ?
        WHERE mi.matrix_report_id = ?
      `, [assignment.assigned_to, assignment.matrix_report_id]);

      const progress = progressResult[0];
      const progressPercentage = progress.total_items > 0
        ? Math.round((progress.items_with_evidence / progress.total_items) * 100 * 100) / 100
        : 0;

      console.log(`   Calculation: ${progress.items_with_evidence}/${progress.total_items} = ${progressPercentage}%`);

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
            ELSE status 
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

      console.log(`   ✅ Updated to: ${progressPercentage}%\n`);
    }

    // Step 3: Verify the results
    console.log('📊 Verification - Updated progress:');
    const [updatedAssignments] = await connection.query(`
      SELECT 
        ma.progress_percentage,
        ma.items_with_evidence,
        ma.total_items,
        u.name as user_name,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      WHERE ma.progress_percentage > 0 OR ma.items_with_evidence > 0
      ORDER BY ma.progress_percentage DESC
    `);

    updatedAssignments.forEach((assignment, idx) => {
      console.log(`${idx + 1}. ${assignment.user_name} - ${assignment.matrix_title}`);
      console.log(`   Progress: ${assignment.progress_percentage}% (${assignment.items_with_evidence}/${assignment.total_items})`);
    });

    if (updatedAssignments.length === 0) {
      console.log('   No assignments with progress > 0%');
    }

    console.log('\n✅ Progress calculation fix completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixProgressCalculation();