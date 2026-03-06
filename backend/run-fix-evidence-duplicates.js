const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('========================================');
  console.log('Fix Evidence Duplicates Migration');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    console.log('✓ Connected to database');
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  Host: ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/026_fix_evidence_duplicates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 026_fix_evidence_duplicates.sql...\n');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✓ Migration completed successfully!\n');

    // Verify the fix
    console.log('Verifying fix...');
    const [duplicates] = await connection.query(`
      SELECT 
        matrix_item_id,
        COUNT(*) as count
      FROM matrix_evidence_tracking
      GROUP BY matrix_item_id
      HAVING count > 1
    `);

    if (duplicates.length === 0) {
      console.log('✓ No duplicates found - Fix successful!\n');
    } else {
      console.log(`⚠ Warning: ${duplicates.length} items still have duplicates\n`);
    }

    // Show statistics
    const [stats] = await connection.query(`
      SELECT 
        COUNT(DISTINCT matrix_item_id) as unique_items,
        COUNT(*) as total_rows
      FROM matrix_evidence_tracking
    `);

    console.log('Database Statistics:');
    console.log(`  Unique matrix items: ${stats[0].unique_items}`);
    console.log(`  Total rows in view: ${stats[0].total_rows}`);
    
    if (stats[0].unique_items === stats[0].total_rows) {
      console.log('  ✓ All items are unique (no duplicates)\n');
    } else {
      console.log(`  ⚠ ${stats[0].total_rows - stats[0].unique_items} duplicate rows detected\n`);
    }

    console.log('========================================');
    console.log('Migration completed successfully!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Restart backend server');
    console.log('2. Test Evidence Database page');
    console.log('3. Verify no duplicates are shown\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('Migration failed!');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('\nPlease check the error and try again.\n');
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
