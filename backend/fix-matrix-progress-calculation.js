const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMatrixProgressCalculation() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔧 FIXING MATRIX PROGRESS CALCULATION');
    console.log('====================================\n');

    // 1. Fix User Dinas Kesehatan status (should be pending, not in_progress)
    console.log('1️⃣ Fixing User Dinas Kesehatan assignment status...');
    
    await connection.query(`
      UPDATE matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      SET ma.status = 'pending'
      WHERE u.name = 'User Dinas Kesehatan' 
        AND mr.title = 'kesehatan'
        AND ma.progress_percentage = 0
        AND ma.items_with_evidence = 0
    `);
    
    console.log('   ✅ Fixed User Dinas Kesehatan status to pending');

    // 2. Recalculate all assignment progress properly
    console.log('\n2️⃣ Recalculating all assignment progress...');
    
    const [assignments] = await connection.query(`
      SELECT ma.id, ma.assigned_to, ma.matrix_report_id, u.name as user_name
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
    `);

    for (const assignment of assignments) {
      // Calculate progress based on evidence uploaded by THIS specific user
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

      console.log(`   📈 ${assignment.user_name}: ${progress.items_with_evidence}/${progress.total_items} = ${progressPercentage}%`);

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
    }

    // 3. Update matrix reports completed_items based on approved items
    console.log('\n3️⃣ Updating matrix reports completed_items...');
    
    await connection.query(`
      UPDATE matrix_reports mr
      SET completed_items = (
        SELECT COUNT(*) 
        FROM matrix_items mi 
        WHERE mi.matrix_report_id = mr.id AND mi.status = 'approved'
      )
    `);

    // 4. Verify the fixes
    console.log('\n4️⃣ Verifying fixes...');
    
    const [verifyAssignments] = await connection.query(`
      SELECT 
        u.name as user_name,
        mr.title as matrix_title,
        ma.status as assignment_status,
        ma.progress_percentage,
        ma.items_with_evidence,
        ma.total_items
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      WHERE mr.title = 'kesehatan'
      ORDER BY u.name
    `);

    console.log('\n📊 KESEHATAN ASSIGNMENTS AFTER FIX:');
    verifyAssignments.forEach(assignment => {
      console.log(`   ${assignment.user_name}:`);
      console.log(`     Status: ${assignment.assignment_status}`);
      console.log(`     Progress: ${assignment.progress_percentage}% (${assignment.items_with_evidence}/${assignment.total_items})`);
      console.log('');
    });

    const [verifyReports] = await connection.query(`
      SELECT 
        mr.title,
        mr.target_opd,
        mr.completed_items,
        COUNT(mi.id) as total_items,
        COUNT(CASE WHEN mi.status = 'approved' THEN 1 END) as actual_approved
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      GROUP BY mr.id
    `);

    console.log('📋 MATRIX REPORTS AFTER FIX:');
    verifyReports.forEach(report => {
      console.log(`   ${report.title} (${report.target_opd}):`);
      console.log(`     Stored Completed: ${report.completed_items}`);
      console.log(`     Actual Approved: ${report.actual_approved}`);
      console.log(`     Total Items: ${report.total_items}`);
      console.log('');
    });

    console.log('✅ MATRIX PROGRESS CALCULATION FIXED!');
    console.log('\n📝 Summary of Changes:');
    console.log('1. Fixed User Dinas Kesehatan status from in_progress to pending');
    console.log('2. Recalculated all assignment progress based on actual evidence');
    console.log('3. Updated matrix reports completed_items counts');
    console.log('4. Progress now reflects actual user work, not manual approvals');

  } catch (error) {
    console.error('❌ Fix Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixMatrixProgressCalculation();