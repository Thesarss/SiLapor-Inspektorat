const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanMatrixData() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Connected to database');
    console.log('');
    console.log('⚠️  WARNING: This will delete ALL matrix data!');
    console.log('   - All matrix reports');
    console.log('   - All matrix items');
    console.log('   - All matrix assignments');
    console.log('   - All evidence files (database records only, files will remain)');
    console.log('');
    
    // Disable foreign key checks temporarily
    console.log('🔓 Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get counts before deletion
    console.log('📊 Getting current counts...');
    const [evidenceCount] = await connection.query('SELECT COUNT(*) as count FROM evidence_files');
    const [itemsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_items');
    const [assignmentsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_assignments');
    const [reportsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_reports');
    
    console.log('');
    console.log('Current data:');
    console.log(`  - Evidence files: ${evidenceCount[0].count}`);
    console.log(`  - Matrix items: ${itemsCount[0].count}`);
    console.log(`  - Matrix assignments: ${assignmentsCount[0].count}`);
    console.log(`  - Matrix reports: ${reportsCount[0].count}`);
    console.log('');
    
    // Delete data in correct order (respecting foreign keys)
    console.log('🗑️  Deleting evidence files...');
    await connection.query('DELETE FROM evidence_files');
    console.log('   ✅ Evidence files deleted');
    
    console.log('🗑️  Deleting matrix items...');
    await connection.query('DELETE FROM matrix_items');
    console.log('   ✅ Matrix items deleted');
    
    console.log('🗑️  Deleting matrix assignments...');
    await connection.query('DELETE FROM matrix_assignments');
    console.log('   ✅ Matrix assignments deleted');
    
    console.log('🗑️  Deleting matrix reports...');
    await connection.query('DELETE FROM matrix_reports');
    console.log('   ✅ Matrix reports deleted');
    
    // Re-enable foreign key checks
    console.log('🔒 Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Verify deletion
    console.log('');
    console.log('✅ Verifying deletion...');
    const [newEvidenceCount] = await connection.query('SELECT COUNT(*) as count FROM evidence_files');
    const [newItemsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_items');
    const [newAssignmentsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_assignments');
    const [newReportsCount] = await connection.query('SELECT COUNT(*) as count FROM matrix_reports');
    
    console.log('');
    console.log('After deletion:');
    console.log(`  - Evidence files: ${newEvidenceCount[0].count}`);
    console.log(`  - Matrix items: ${newItemsCount[0].count}`);
    console.log(`  - Matrix assignments: ${newAssignmentsCount[0].count}`);
    console.log(`  - Matrix reports: ${newReportsCount[0].count}`);
    console.log('');
    
    if (newEvidenceCount[0].count === 0 && 
        newItemsCount[0].count === 0 && 
        newAssignmentsCount[0].count === 0 && 
        newReportsCount[0].count === 0) {
      console.log('✅ SUCCESS! All matrix data has been cleaned');
      console.log('');
      console.log('📝 Note: Uploaded files in backend/uploads/matrix/ still exist');
      console.log('   You can manually delete them if needed');
    } else {
      console.log('⚠️  WARNING: Some data may still remain');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning matrix data:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the cleanup
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('         CLEAN MATRIX DATA - DATABASE CLEANUP          ');
console.log('═══════════════════════════════════════════════════════');
console.log('');

cleanMatrixData()
  .then(() => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    CLEANUP COMPLETE                    ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('                    CLEANUP FAILED                      ');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  });
