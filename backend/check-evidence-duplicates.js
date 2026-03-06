const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDuplicates() {
  console.log('========================================');
  console.log('Check Evidence Duplicates');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('✓ Connected to database\n');

    // Check 1: Duplicates in evidence_files table
    console.log('1. Checking evidence_files table for duplicates...');
    const [evidenceDuplicates] = await connection.query(`
      SELECT 
        matrix_item_id,
        original_filename,
        COUNT(*) as count
      FROM evidence_files
      GROUP BY matrix_item_id, original_filename
      HAVING count > 1
    `);

    if (evidenceDuplicates.length > 0) {
      console.log(`   ⚠ Found ${evidenceDuplicates.length} duplicate evidence files:`);
      evidenceDuplicates.forEach(dup => {
        console.log(`   - Matrix Item: ${dup.matrix_item_id}, File: ${dup.original_filename}, Count: ${dup.count}`);
      });
    } else {
      console.log('   ✓ No duplicates in evidence_files table\n');
    }

    // Check 2: Total evidence files
    console.log('2. Evidence files statistics:');
    const [evidenceStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(DISTINCT matrix_item_id) as unique_items
      FROM evidence_files
    `);
    console.log(`   Total files: ${evidenceStats[0].total_files}`);
    console.log(`   Unique IDs: ${evidenceStats[0].unique_ids}`);
    console.log(`   Unique matrix items: ${evidenceStats[0].unique_items}\n`);

    // Check 3: Matrix items with multiple evidence
    console.log('3. Matrix items with multiple evidence files:');
    const [multipleEvidence] = await connection.query(`
      SELECT 
        matrix_item_id,
        COUNT(*) as evidence_count
      FROM evidence_files
      GROUP BY matrix_item_id
      HAVING evidence_count > 1
      ORDER BY evidence_count DESC
      LIMIT 10
    `);
    
    if (multipleEvidence.length > 0) {
      console.log(`   Found ${multipleEvidence.length} items with multiple evidence:`);
      multipleEvidence.forEach(item => {
        console.log(`   - Matrix Item: ${item.matrix_item_id}, Evidence Count: ${item.evidence_count}`);
      });
    } else {
      console.log('   ✓ No items with multiple evidence\n');
    }

    // Check 4: Sample evidence data
    console.log('\n4. Sample evidence data (first 5):');
    const [sampleData] = await connection.query(`
      SELECT 
        ef.id,
        ef.matrix_item_id,
        ef.original_filename,
        ef.status,
        mi.item_number,
        mr.title as matrix_title
      FROM evidence_files ef
      LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
      LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      ORDER BY ef.uploaded_at DESC
      LIMIT 5
    `);
    
    sampleData.forEach((row, index) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Matrix: ${row.matrix_title || 'N/A'}`);
      console.log(`      Item: #${row.item_number || 'N/A'}`);
      console.log(`      File: ${row.original_filename}`);
      console.log(`      Status: ${row.status}\n`);
    });

    // Check 5: Check if there are NULL matrix_item_id
    console.log('5. Checking for orphaned evidence (NULL matrix_item_id):');
    const [orphaned] = await connection.query(`
      SELECT COUNT(*) as count
      FROM evidence_files
      WHERE matrix_item_id IS NULL
    `);
    
    if (orphaned[0].count > 0) {
      console.log(`   ⚠ Found ${orphaned[0].count} orphaned evidence files\n`);
    } else {
      console.log('   ✓ No orphaned evidence files\n');
    }

    // Check 6: Simulate the search query
    console.log('6. Simulating search query (like frontend does):');
    const [searchResult] = await connection.query(`
      SELECT DISTINCT
        ef.id,
        ef.matrix_item_id,
        ef.original_filename as evidence_filename,
        ef.file_size as evidence_file_size,
        ef.file_path as evidence_file_path,
        ef.status,
        ef.uploaded_at,
        u1.name as uploaded_by_name,
        u1.institution as uploader_institution,
        mi.item_number,
        mi.temuan,
        mr.id as matrix_report_id,
        mr.title as matrix_title,
        mr.target_opd
      FROM evidence_files ef
      LEFT JOIN users u1 ON ef.uploaded_by = u1.id
      LEFT JOIN users u2 ON ef.reviewed_by = u2.id
      LEFT JOIN matrix_items mi ON ef.matrix_item_id = mi.id
      LEFT JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      ORDER BY ef.uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Query returned ${searchResult.length} rows`);
    
    // Check for duplicates in result
    const ids = searchResult.map(r => r.id);
    const uniqueIds = [...new Set(ids)];
    
    if (ids.length !== uniqueIds.length) {
      console.log(`   ⚠ WARNING: Query returned duplicate IDs!`);
      console.log(`   Total rows: ${ids.length}, Unique IDs: ${uniqueIds.length}\n`);
    } else {
      console.log(`   ✓ No duplicates in query result\n`);
    }

    console.log('========================================');
    console.log('Check Complete');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDuplicates();
