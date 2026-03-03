const mysql = require('mysql2/promise');

async function diagnoseMatrixReview() {
  console.log('🔍 DIAGNOSA MASALAH MATRIX REVIEW\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evaluation_reporting'
  });

  try {
    // 1. Check matrix items with submitted status
    console.log('1️⃣ Matrix Items dengan Status "Submitted":\n');
    const [submitted] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        LEFT(mi.temuan, 50) as temuan_short,
        mi.status,
        mi.tindak_lanjut IS NOT NULL as has_tindak_lanjut,
        mi.evidence_filename,
        mi.evidence_file_path IS NOT NULL as has_evidence_path,
        mr.title as matrix_title
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      WHERE mi.status = 'submitted'
      ORDER BY mi.updated_at DESC
    `);

    console.log(`Found ${submitted.length} submitted items:\n`);
    submitted.forEach(item => {
      console.log(`Item #${item.item_number}: ${item.temuan_short}...`);
      console.log(`   Matrix: ${item.matrix_title}`);
      console.log(`   Tindak Lanjut: ${item.has_tindak_lanjut ? '✅ Ada' : '❌ Tidak ada'}`);
      console.log(`   Evidence Filename: ${item.evidence_filename || '❌ Tidak ada'}`);
      console.log(`   Evidence Path: ${item.has_evidence_path ? '✅ Ada' : '❌ Tidak ada'}`);
      console.log('');
    });

    // 2. Check progress mismatch
    console.log('\n2️⃣ Matrix Reports Progress Check:\n');
    const [reports] = await connection.execute(`
      SELECT 
        mr.id,
        mr.title,
        mr.total_items as stored_total,
        mr.completed_items as stored_completed,
        COUNT(mi.id) as actual_total,
        SUM(CASE WHEN mi.status = 'approved' THEN 1 ELSE 0 END) as actual_completed,
        SUM(CASE WHEN mi.status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN mi.status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      GROUP BY mr.id, mr.title, mr.total_items, mr.completed_items
      ORDER BY mr.created_at DESC
      LIMIT 5
    `);

    reports.forEach(r => {
      console.log(`📋 ${r.title}`);
      console.log(`   Stored: ${r.stored_completed}/${r.stored_total} completed`);
      console.log(`   Actual: ${r.actual_completed}/${r.actual_total} completed`);
      console.log(`   Submitted: ${r.submitted_count}`);
      console.log(`   Pending: ${r.pending_count}`);
      
      if (r.stored_total != r.actual_total) {
        console.log(`   ⚠️  Total items mismatch!`);
      }
      if (r.stored_completed != r.actual_completed) {
        console.log(`   ⚠️  Completed items mismatch!`);
      }
      console.log('');
    });

    // 3. Recommendations
    console.log('\n3️⃣ REKOMENDASI PERBAIKAN:\n');
    
    const noEvidence = submitted.filter(s => !s.evidence_filename);
    if (noEvidence.length > 0) {
      console.log(`❌ MASALAH: ${noEvidence.length} items submitted tanpa evidence`);
      console.log('   FIX: Evidence harus diupload sebelum submit\n');
    }
    
    const mismatch = reports.filter(r => r.stored_completed != r.actual_completed);
    if (mismatch.length > 0) {
      console.log(`❌ MASALAH: ${mismatch.length} matrix reports dengan progress tidak sync`);
      console.log('   FIX: Update completed_items setelah review approve/reject\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

diagnoseMatrixReview();
