// Script untuk membuat tabel report_files
require('dotenv').config();
const mysql = require('mysql2/promise');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createReportFilesTable() {
  let connection;
  
  try {
    log('\n🔧 Creating report_files Table\n', 'cyan');
    log('=' .repeat(60), 'blue');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'audit_system'
    });

    log('\n✅ Database connected', 'green');

    // Check if table exists
    const [existing] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'report_files'`,
      [process.env.DB_NAME || 'audit_system']
    );

    if (existing[0].count > 0) {
      log('\n✓ Table report_files already exists', 'blue');
      
      // Show structure
      const [columns] = await connection.query('DESCRIBE report_files');
      log('\nTable structure:', 'cyan');
      columns.forEach(col => {
        log(`  - ${col.Field} (${col.Type})`, 'blue');
      });
      
      return;
    }

    log('\n📋 Creating report_files table (step 1: without foreign keys)...', 'yellow');

    await connection.query(`
      CREATE TABLE report_files (
        id VARCHAR(36) PRIMARY KEY,
        report_id VARCHAR(36) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100),
        uploaded_by VARCHAR(36) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_report_files_report (report_id),
        INDEX idx_report_files_uploaded_by (uploaded_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    log('  ✅ Table created', 'green');
    
    log('\n📋 Adding foreign keys (step 2)...', 'yellow');
    
    try {
      await connection.query(`
        ALTER TABLE report_files 
        ADD CONSTRAINT fk_report_files_report 
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
      `);
      log('  ✅ Foreign key for report_id added', 'green');
    } catch (err) {
      log(`  ⚠️  Could not add FK for report_id: ${err.message}`, 'yellow');
    }
    
    try {
      await connection.query(`
        ALTER TABLE report_files 
        ADD CONSTRAINT fk_report_files_user 
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      `);
      log('  ✅ Foreign key for uploaded_by added', 'green');
    } catch (err) {
      log(`  ⚠️  Could not add FK for uploaded_by: ${err.message}`, 'yellow');
    }

    log('  ✅ Table created successfully', 'green');

    // Verify
    const [verify] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'report_files'`,
      [process.env.DB_NAME || 'audit_system']
    );

    if (verify[0].count > 0) {
      log('\n✅ Table verified successfully', 'green');
      
      // Show structure
      const [columns] = await connection.query('DESCRIBE report_files');
      log('\nTable structure:', 'cyan');
      columns.forEach(col => {
        log(`  - ${col.Field} (${col.Type})`, 'blue');
      });
    }

    log('\n' + '='.repeat(60), 'blue');
    log('\n✅ report_files table ready!\n', 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createReportFilesTable();
