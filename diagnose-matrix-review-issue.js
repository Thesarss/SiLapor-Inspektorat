const mysql = require('mysql2/promise');

async function diagnoseMatrixReviewIssue() {
  console.log('🔍 DIAGNOSA MASALAH MATRIX REVIEW\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evaluation_reporting'
  });

  try {
    // 1. Check matrix items status
    console.log('1️⃣ Checking Matrix Items Status...\n');
    const [items] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        mi.temuan,
        mi.status,
        mi.tindak_lanjut,
        mi.evidence_filename,
        mi.evidence_file_path,
        mi.evidence_file_size,
        mr.title as matrix_title,
        mr.target_opd
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      ORDER BY mr.created_at DESC, mi.item_number ASC
      LIMIT 20
    `);

    console.log(`Found ${items.length} matrix items:\n`);
    items.forEach(item => {
      console.log(`Item #${item.item_number}: ${item.temuan.substring(0, 50)}...`);
      console.log(`   Matrix: ${item.matrix_title}`);
      console.log(`   Target OPD: ${item.target_opd}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Tindak Lanjut: ${item.tindak_lanjut ? 'Ada' : 'Tidak ada'}`);
      console.log(`   Evidence: ${item.evidence_filename || 'Tidak ada'}`);
      console.log(`   Evidence Path: ${item.evidence_file_path || 'Tidak ada'}`);
      console.log(`   Evidence Size: ${item.evidence_file_size || 0} bytes`);
      console.log('');
    });

    // 2. Check items with status 'submitted' but no evidence
    console.log('\n2️⃣ Checking Submitted Items Without Evidence...\n');
    const [submittedNoEvidence] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        mi.temuan,
        mi.tindak_lanjut,
        mi.evidence_filename,
        mr.title as matrix_title
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      WHERE mi.status = 'submitted' 
        AND (mi.evidence_filename IS NULL OR mi.evidence_file_path IS NULL)
    `);

    if (submittedNoEvidence.length > 0) {
      console.log(`⚠️  Found ${submittedNoEvidence.length} submitted items WITHOUT evidence:`);
      submittedNoEvidence.forEach(item => {
        console.log(`   - Item #${item.item_number}: ${item.temuan.substring(0, 40)}...`);
        console.log(`     Tindak Lanjut: ${item.tindak_lanjut ? 'Ada' : 'TIDAK ADA'}`);
        console.log(`     Evidence: ${item.evidence_filename || 'TIDAK ADA'}`);
      });
    } else {
      console.log('✅ All submitted items have evidence');
    }

    // 3. Check evidence_files table
    console.log('\n3️⃣ Checking Evidence Files Table...\n');
    const [evidenceFiles] = await connection.execute(`
      SELECT 
        ef.id,
        ef.matrix_item_id,
        ef.original_filename,
        ef.file_size,
        ef.uploaded_at,
        mi.item_number,
        mi.status as item_status,
        mr.title as matrix_title
      FROM evidence_files ef
      LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
      LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      ORDER BY ef.uploaded_at DESC
      LIMIT 10
    `);

    console.log(`Found ${evidenceFiles.length} evidence files in evidence_files table:\n`);
    evidenceFiles.forEach(ef => {
      console.log(`Evidence: ${ef.original_filename}`);
      console.log(`   Matrix Item: #${ef.item_number || 'N/A'}`);
      console.log(`   Matrix: ${ef.matrix_title || 'N/A'}`);
      console.log(`   Item Status: ${ef.item_status || 'N/A'}`);
      console.log(`   File Size: ${ef.file_size} bytes`);
      console.log(`   Uploaded: ${ef.uploaded_at}`);
      console.log('');
    });

    // 4. Check for duplicate submissions
    console.log('\n4️⃣ Checking for Items with Multiple Status Changes...\n');
    const [statusChanges] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        mi.status,
        mi.updated_at,
        mr.title as matrix_title,
        COUNT(*) as change_count
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      GROUP BY mi.id, mi.item_number, mi.status, mi.updated_at, mr.title
      HAVING change_count > 1
    `);

    if (statusChanges.length > 0) {
      console.log(`⚠️  Found ${statusChanges.length} items with multiple status changes`);
    } else {
      console.log('✅ No duplicate status changes found');
    }

    // 5. Check matrix_reports progress tracking
    console.log('\n5️⃣ Checking Matrix Reports Progress Tracking...\n');
    const [reports] = await connection.execute(`
      SELECT 
        mr.id,
        mr.title,
        mr.target_opd,
        mr.total_items,
        mr.completed_items,
        mr.status,
        COUNT(mi.id) as actual_items,
        SUM(CASE WHEN mi.status = 'approved' THEN 1 ELSE 0 END) as actual_completed,
        SUM(CASE WHEN mi.status = 'submitted' THEN 1 ELSE 0 END) as submitted_items,
        SUM(CASE WHEN mi.status = 'pending' THEN 1 ELSE 0 END) as pending_items
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      GROUP BY mr.id, mr.title, mr.target_opd, mr.total_items, mr.completed_items, mr.status
      ORDER BY mr.created_at DESC
      LIMIT 5
    `);

    console.log('Matrix Reports Progress:\n');
    reports.forEach(report => {
      console.log(`📋 ${report.title}`);
      console.log(`   Target OPD: ${report.target_opd}`);
      console.log(`   Stored Total Items: ${report.total_items}`);
      console.log(`   Actual Items in DB: ${report.actual_items}`);
      console.log(`   Stored Completed: ${report.completed_items}`);
      console.log(`   Actual Completed: ${report.actual_completed}`);
      console.log(`   Submitted: ${report.submitted_items}`);
      console.log(`   Pending: ${report.pending_items}`);
      
      if (report.total_items !== report.actual_items) {
        console.log(`   ⚠️  MISMATCH: total_items (${report.total_items}) != actual items (${report.actual_items})`);
      }
      if (report.completed_items !== report.actual_completed) {
        console.log(`   ⚠️  MISMATCH: completed_items (${report.completed_items}) != actual completed (${report.actual_completed})`);
      }
      console.log('');
    });

    // 6. Identify the specific issue
    console.log('\n6️⃣ DIAGNOSIS SUMMARY:\n');
    
    const issuesFound = [];
    
    if (submittedNoEvidence.length > 0) {
      issuesFound.push(`❌ ${submittedNoEvidence.length} items marked as 'submitted' but have NO evidence`);
    }
    
    const mismatchedReports = reports.filter(r => 
      r.total_items !== r.actual_items || r.completed_items !== r.actual_completed
    );
    
    if (mismatchedReports.length > 0) {
      issuesFound.push(`❌ ${mismatchedReports.length} matrix reports have mismatched progress counts`);
    }

    if (issuesFound.length > 0) {
      console.log('ISSUES FOUND:');
      issuesFound.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 RECOMMENDED FIXES:');
      console.log('   1. Update matrix_reports.completed_items to match actual approved items');
      console.log('   2. Ensure evidence is properly saved when items are submitted');
      console.log('   3. Add validation to prevent submission without evidence if required');
    } else {
      console.log('✅ No major issues found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

diagnoseMatrixReviewIssue();
