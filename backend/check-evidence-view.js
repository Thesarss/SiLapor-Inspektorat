const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkView() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('CHECKING EVIDENCE VIEW');
    console.log('========================================\n');

    // Check if view exists
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'matrix_evidence_tracking'
    `, [process.env.DB_NAME || 'evaluation_reporting']);

    if (views.length === 0) {
      console.log('❌ View matrix_evidence_tracking does NOT exist');
      return;
    }

    console.log('✓ View matrix_evidence_tracking exists\n');

    // Get view definition
    const [viewDef] = await connection.query(`
      SHOW CREATE VIEW matrix_evidence_tracking
    `);
    
    console.log('VIEW DEFINITION:');
    console.log('================');
    console.log(viewDef[0]['Create View']);
    console.log('\n');

    // Test the view with actual data
    console.log('TESTING VIEW WITH ACTUAL DATA:');
    console.log('==============================\n');

    const [viewData] = await connection.query(`
      SELECT 
        matrix_report_id,
        matrix_title,
        target_opd,
        COUNT(*) as row_count,
        COUNT(DISTINCT matrix_item_id) as unique_items
      FROM matrix_evidence_tracking
      GROUP BY matrix_report_id, matrix_title, target_opd
    `);

    viewData.forEach(row => {
      const hasDuplicates = row.row_count !== row.unique_items;
      console.log(`${hasDuplicates ? '⚠' : '✓'} ${row.matrix_title} (${row.target_opd})`);
      console.log(`   Total rows: ${row.row_count}`);
      console.log(`   Unique items: ${row.unique_items}`);
      if (hasDuplicates) {
        console.log(`   ⚠ DUPLICATION FACTOR: ${row.row_count / row.unique_items}x`);
      }
      console.log('');
    });

    // Check for specific duplicates
    console.log('CHECKING FOR DUPLICATE ROWS:');
    console.log('============================\n');

    const [duplicates] = await connection.query(`
      SELECT 
        matrix_item_id,
        matrix_title,
        item_number,
        COUNT(*) as count
      FROM matrix_evidence_tracking
      GROUP BY matrix_item_id, matrix_title, item_number
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (duplicates.length > 0) {
      console.log(`⚠ FOUND ${duplicates.length} DUPLICATE ROWS IN VIEW:`);
      duplicates.forEach(dup => {
        console.log(`   - Item ID: ${dup.matrix_item_id}, Item #${dup.item_number}, Count: ${dup.count}`);
      });
    } else {
      console.log('✓ No duplicate rows in view');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkView();
