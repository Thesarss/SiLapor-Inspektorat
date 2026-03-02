#!/usr/bin/env node

/**
 * Fix Evidence Tracking View
 * Check and create matrix_evidence_tracking view
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixEvidenceTrackingView() {
  console.log('🔧 Fixing Evidence Tracking View...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database\n');
    
    // Check if view exists
    console.log('📋 Checking if view exists...');
    const [views] = await connection.query(`
      SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_${process.env.DB_NAME || 'evaluation_reporting'} = 'matrix_evidence_tracking'
    `);
    
    if (views.length > 0) {
      console.log('✅ View exists, dropping it first...');
      await connection.query('DROP VIEW IF EXISTS matrix_evidence_tracking');
    } else {
      console.log('⚠️  View does not exist');
    }
    
    // Create the view
    console.log('\n📋 Creating matrix_evidence_tracking view...');
    
    const createViewSQL = `
CREATE OR REPLACE VIEW matrix_evidence_tracking AS
SELECT 
    mi.id as matrix_item_id,
    mi.matrix_report_id,
    mi.item_number,
    mi.temuan,
    mi.penyebab,
    mi.rekomendasi,
    mi.tindak_lanjut,
    mi.status as item_status,
    mi.created_at as submitted_at,
    mi.reviewed_at,
    mr.title as matrix_title,
    mr.target_opd,
    ma.assigned_to as opd_user_id,
    u.name as opd_user_name,
    u.institution as opd_institution,
    COALESCE(
        (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        0
    ) as evidence_count,
    COALESCE(
        (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
         FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as evidence_files,
    COALESCE(
        (SELECT MAX(ef.uploaded_at) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
        NULL
    ) as last_evidence_upload,
    COALESCE(
        (SELECT ef.status FROM evidence_files ef WHERE ef.matrix_item_id = mi.id ORDER BY ef.uploaded_at DESC LIMIT 1), 
        NULL
    ) as latest_evidence_status
FROM matrix_items mi
JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
JOIN users u ON ma.assigned_to = u.id
ORDER BY mr.created_at DESC, mi.item_number ASC;
    `;
    
    await connection.query(createViewSQL);
    console.log('✅ View created successfully!\n');
    
    // Test the view
    console.log('📋 Testing view...');
    const [testResult] = await connection.query('SELECT * FROM matrix_evidence_tracking LIMIT 5');
    
    console.log(`✅ View works! Found ${testResult.length} records\n`);
    
    if (testResult.length > 0) {
      console.log('Sample data:');
      testResult.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.matrix_title} - Item #${row.item_number}`);
        console.log(`     Evidence count: ${row.evidence_count}`);
        console.log(`     Status: ${row.item_status}`);
      });
    } else {
      console.log('⚠️  No data in view (this is OK if no matrix items exist yet)');
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ SUCCESS!');
    console.log('═══════════════════════════════════════');
    console.log('View matrix_evidence_tracking has been created.');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Test the Matrix Progress page');
    console.log('3. Evidence tracking should now work');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Possible issues:');
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('1. Required tables do not exist:');
      console.error('   - matrix_items');
      console.error('   - matrix_reports');
      console.error('   - matrix_assignments');
      console.error('   - evidence_files');
      console.error('   - users');
      console.error('\n💡 Solution: Run matrix and evidence migrations first');
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('1. Column mismatch in tables');
      console.error('2. Check table structure matches migration files');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixEvidenceTrackingView();
