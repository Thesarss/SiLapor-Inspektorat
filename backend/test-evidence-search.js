const mysql = require('mysql2/promise');
require('dotenv').config();

async function testEvidenceSearch() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('TESTING EVIDENCE SEARCH QUERY');
    console.log('========================================\n');

    // Check how many evidence files exist
    const [evidenceCount] = await connection.query(`
      SELECT COUNT(*) as total FROM evidence_files
    `);
    console.log(`Total evidence files in database: ${evidenceCount[0].total}\n`);

    // Test the actual query from searchEvidence
    const baseQuery = `
      FROM evidence_files ef
      LEFT JOIN users u1 ON ef.uploaded_by = u1.id
      LEFT JOIN users u2 ON ef.reviewed_by = u2.id
      LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
      LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
    `;

    // Count query
    const countQuery = `SELECT COUNT(DISTINCT ef.id) as total ${baseQuery}`;
    const [countResult] = await connection.query(countQuery);
    console.log(`Count query result: ${countResult[0].total} evidence files\n`);

    // Main query
    const mainQuery = `
      SELECT DISTINCT
        ef.id,
        ef.matrix_item_id,
        ef.original_filename as evidence_filename,
        ef.file_size as evidence_file_size,
        ef.file_path as evidence_file_path,
        ef.status,
        ef.uploaded_at,
        ef.reviewed_at,
        ef.description as review_notes,
        u1.name as uploaded_by_name,
        u1.institution as uploader_institution,
        u2.name as reviewed_by_name,
        mi.item_number,
        mi.temuan,
        mi.penyebab,
        mi.rekomendasi,
        mi.tindak_lanjut,
        mr.id as matrix_report_id,
        mr.title as matrix_title,
        mr.target_opd
      ${baseQuery}
      ORDER BY ef.uploaded_at DESC
      LIMIT 20 OFFSET 0
    `;

    const [mainResult] = await connection.query(mainQuery);
    console.log(`Main query result: ${mainResult.length} rows\n`);

    if (mainResult.length > 0) {
      console.log('Sample results:');
      mainResult.slice(0, 3).forEach((row, index) => {
        console.log(`\n${index + 1}. Evidence ID: ${row.id}`);
        console.log(`   File: ${row.evidence_filename}`);
        console.log(`   Matrix: ${row.matrix_title}`);
        console.log(`   Item #${row.item_number}`);
        console.log(`   Status: ${row.status}`);
      });
    } else {
      console.log('✓ No evidence files found (expected if none uploaded yet)');
    }

    // Check matrix items without evidence
    console.log('\n========================================');
    console.log('MATRIX ITEMS WITHOUT EVIDENCE');
    console.log('========================================\n');

    const [itemsWithoutEvidence] = await connection.query(`
      SELECT 
        mi.id,
        mi.item_number,
        mr.title as matrix_title,
        mr.target_opd,
        LEFT(mi.temuan, 50) as temuan_preview,
        (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id) as evidence_count
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      WHERE NOT EXISTS (
        SELECT 1 FROM evidence_files ef WHERE ef.matrix_item_id = mi.id
      )
      LIMIT 5
    `);

    console.log(`Total items without evidence: ${itemsWithoutEvidence.length}`);
    itemsWithoutEvidence.forEach((item, index) => {
      console.log(`\n${index + 1}. Item #${item.item_number} - ${item.matrix_title}`);
      console.log(`   Temuan: ${item.temuan_preview}...`);
      console.log(`   Evidence count: ${item.evidence_count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

testEvidenceSearch();
