const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    multipleStatements: true
  });

  try {
    console.log('🔄 Starting Matrix Data Synchronization Fix...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/025_fix_matrix_data_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration file loaded');
    console.log('⚠️  This will:');
    console.log('   1. Migrate evidence from matrix_items to evidence_files');
    console.log('   2. Add evidence_count column');
    console.log('   3. Create triggers for auto-updates');
    console.log('   4. Fix progress calculations');
    console.log('   5. Update assignment statuses');
    console.log('   6. Add cascade delete for evidence\n');

    // Backup check
    console.log('💾 IMPORTANT: Make sure you have a database backup!');
    console.log('   Run: mysqldump -u root -p evaluation_reporting > backup.sql\n');

    // Check current state
    const [items] = await connection.query('SELECT COUNT(*) as count FROM matrix_items WHERE evidence_filename IS NOT NULL');
    console.log(`📊 Found ${items[0].count} matrix items with evidence to migrate\n`);

    const [reports] = await connection.query('SELECT COUNT(*) as count FROM matrix_reports');
    console.log(`📊 Found ${reports[0].count} matrix reports\n`);

    // Execute migration
    console.log('🚀 Executing migration...\n');
    await connection.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify results
    const [evidenceCount] = await connection.query('SELECT COUNT(*) as count FROM evidence_files');
    console.log(`✅ Total evidence files: ${evidenceCount[0].count}`);

    const [itemsWithEvidence] = await connection.query('SELECT COUNT(*) as count FROM matrix_items WHERE evidence_count > 0');
    console.log(`✅ Matrix items with evidence: ${itemsWithEvidence[0].count}`);

    const [assignmentsInProgress] = await connection.query('SELECT COUNT(*) as count FROM matrix_assignments WHERE status = "in_progress"');
    console.log(`✅ Assignments in progress: ${assignmentsInProgress[0].count}`);

    const [assignmentsCompleted] = await connection.query('SELECT COUNT(*) as count FROM matrix_assignments WHERE status = "completed"');
    console.log(`✅ Assignments completed: ${assignmentsCompleted[0].count}`);

    console.log('\n🎉 Matrix data synchronization fixed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test Matrix pages in the application');
    console.log('   2. Verify evidence upload/download works');
    console.log('   3. Check progress calculations are correct');
    console.log('   4. Monitor assignment status updates');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connection settings in .env');
    console.error('   2. Ensure database exists and is accessible');
    console.error('   3. Verify you have necessary permissions');
    console.error('   4. Check if triggers already exist (may need to drop manually)');
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

