const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDataSynchronization() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔧 FIXING DATA SYNCHRONIZATION ISSUES');
    console.log('=====================================\n');

    // 1. Fix matrix_reports completed_items count
    console.log('1️⃣ Fixing matrix_reports completed_items count...');
    
    const [reports] = await connection.query(`
      SELECT id, title, completed_items,
        (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status = 'approved') as actual_completed
      FROM matrix_reports mr
    `);

    for (const report of reports) {
      if (report.completed_items !== report.actual_completed) {
        console.log(`   📊 Updating ${report.title}: ${report.completed_items} → ${report.actual_completed}`);
        await connection.query(`
          UPDATE matrix_reports 
          SET completed_items = ? 
          WHERE id = ?
        `, [report.actual_completed, report.id]);
      }
    }

    // 2. Fix matrix_progress_view to show per-user evidence counts
    console.log('\n2️⃣ Recreating matrix_progress_view with per-user evidence counts...');
    
    await connection.query(`DROP VIEW IF EXISTS matrix_progress_view`);
    
    await connection.query(`
      CREATE OR REPLACE VIEW matrix_progress_view AS
      SELECT 
          ma.id as assignment_id,
          ma.assigned_to,
          ma.assigned_by,
          ma.status as assignment_status,
          ma.assigned_at,
          ma.completed_at,
          ma.progress_percentage,
          ma.items_with_evidence,
          ma.total_items,
          ma.last_activity_at,
          mr.id as matrix_report_id,
          mr.title as matrix_title,
          mr.description as matrix_description,
          mr.target_opd,
          mr.created_at as matrix_created_at,
          u.name as opd_user_name,
          u.email as opd_user_email,
          u.institution as opd_institution,
          inspector.name as inspector_name,
          -- Calculate completion stats
          COALESCE(
              (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status IN ('submitted', 'approved')), 
              0
          ) as completed_items,
          COALESCE(
              (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id), 
              0
          ) as total_matrix_items,
          -- Per-user evidence count (only evidence uploaded by this specific user)
          COALESCE(
              (SELECT COUNT(*) FROM evidence_files ef 
               JOIN matrix_items mi ON ef.matrix_item_id = mi.id 
               WHERE mi.matrix_report_id = mr.id AND ef.uploaded_by = ma.assigned_to), 
              0
          ) as evidence_files_count
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      JOIN users inspector ON ma.assigned_by = inspector.id
      ORDER BY ma.assigned_at DESC
    `);

    // 3. Recalculate all assignment progress to ensure consistency
    console.log('\n3️⃣ Recalculating assignment progress...');
    
    const [assignments] = await connection.query(`
      SELECT ma.id, ma.assigned_to, ma.matrix_report_id
      FROM matrix_assignments ma
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

      console.log(`   📈 Assignment ${assignment.id}: ${progress.items_with_evidence}/${progress.total_items} = ${progressPercentage}%`);

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
    }

    // 4. Create per-user evidence tracking view
    console.log('\n4️⃣ Creating per-user evidence tracking view...');
    
    await connection.query(`DROP VIEW IF EXISTS matrix_evidence_tracking_per_user`);
    
    await connection.query(`
      CREATE OR REPLACE VIEW matrix_evidence_tracking_per_user AS
      SELECT 
          mi.id as matrix_item_id,
          mi.matrix_report_id,
          mi.item_number,
          mi.temuan,
          mi.penyebab,
          mi.rekomendasi,
          mi.tindak_lanjut,
          mi.status as item_status,
          mi.reviewed_at,
          mr.title as matrix_title,
          mr.target_opd,
          ma.assigned_to as opd_user_id,
          u.name as opd_user_name,
          u.institution as opd_institution,
          -- Evidence information per user
          COALESCE(
              (SELECT COUNT(*) FROM evidence_files ef 
               WHERE ef.matrix_item_id = mi.id AND ef.uploaded_by = ma.assigned_to), 
              0
          ) as evidence_count,
          COALESCE(
              (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
               FROM evidence_files ef 
               WHERE ef.matrix_item_id = mi.id AND ef.uploaded_by = ma.assigned_to), 
              NULL
          ) as evidence_files,
          COALESCE(
              (SELECT MAX(ef.uploaded_at) FROM evidence_files ef 
               WHERE ef.matrix_item_id = mi.id AND ef.uploaded_by = ma.assigned_to), 
              NULL
          ) as last_evidence_upload,
          COALESCE(
              (SELECT ef.status FROM evidence_files ef 
               WHERE ef.matrix_item_id = mi.id AND ef.uploaded_by = ma.assigned_to 
               ORDER BY ef.uploaded_at DESC LIMIT 1), 
              NULL
          ) as latest_evidence_status
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      ORDER BY mr.created_at DESC, u.name ASC, mi.item_number ASC
    `);

    // 5. Verify the fixes
    console.log('\n5️⃣ Verifying fixes...');
    
    // Check matrix reports
    const [updatedReports] = await connection.query(`
      SELECT mr.title, mr.completed_items,
        (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status = 'approved') as actual_completed
      FROM matrix_reports mr
    `);

    console.log('\n📊 Matrix Reports Status:');
    updatedReports.forEach(report => {
      const status = report.completed_items === report.actual_completed ? '✅' : '❌';
      console.log(`   ${status} ${report.title}: ${report.completed_items} completed`);
    });

    // Check progress view
    const [progressView] = await connection.query(`
      SELECT opd_user_name, matrix_title, progress_percentage, items_with_evidence, total_items, evidence_files_count
      FROM matrix_progress_view
      WHERE evidence_files_count > 0
      ORDER BY opd_user_name
    `);

    console.log('\n📈 Progress View (Users with Evidence):');
    progressView.forEach(progress => {
      console.log(`   👤 ${progress.opd_user_name} - ${progress.matrix_title}`);
      console.log(`      Progress: ${progress.progress_percentage}% (${progress.items_with_evidence}/${progress.total_items})`);
      console.log(`      Evidence Files: ${progress.evidence_files_count}`);
    });

    console.log('\n✅ DATA SYNCHRONIZATION FIXES COMPLETED!');
    console.log('\n📋 Summary of Changes:');
    console.log('   1. Fixed matrix_reports completed_items counts');
    console.log('   2. Updated matrix_progress_view to show per-user evidence counts');
    console.log('   3. Recalculated all assignment progress percentages');
    console.log('   4. Created per-user evidence tracking view');
    console.log('   5. All data should now be synchronized between users');

  } catch (error) {
    console.error('❌ Fix Error:', error.message);
    console.error('   Rolling back changes...');
    await connection.rollback();
  } finally {
    await connection.end();
  }
}

fixDataSynchronization();