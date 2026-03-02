// Script untuk memeriksa apakah tabel Matrix Audit sudah dibuat
require('dotenv').config();
const mysql = require('mysql2/promise');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTables() {
  let connection;
  
  try {
    log('\n🔍 Checking Matrix Audit Tables...\n', 'yellow');

    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'audit_system'
    });

    log('✅ Database connection established', 'green');

    // Tables to check
    const requiredTables = [
      'matrix_reports',
      'matrix_items',
      'matrix_assignments',
      'matrix_item_history',
      'matrix_upload_sessions'
    ];

    log('\nChecking required tables:', 'yellow');
    
    for (const tableName of requiredTables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME || 'audit_system', tableName]
      );

      if (rows[0].count > 0) {
        // Get row count
        const [countRows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        log(`  ✅ ${tableName} - EXISTS (${countRows[0].count} rows)`, 'green');
        
        // Get column info
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        log(`     Columns: ${columns.length}`, 'blue');
      } else {
        log(`  ❌ ${tableName} - NOT FOUND`, 'red');
      }
    }

    // Check if migration 019 has been run
    log('\nChecking migration status:', 'yellow');
    const [migrations] = await connection.query(
      `SELECT * FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'migrations'`,
      [process.env.DB_NAME || 'audit_system']
    );

    if (migrations.length > 0) {
      const [migrationRecords] = await connection.query(
        `SELECT * FROM migrations WHERE name LIKE '%matrix%' ORDER BY executed_at DESC`
      );
      
      if (migrationRecords.length > 0) {
        log('  Matrix-related migrations found:', 'green');
        migrationRecords.forEach(record => {
          log(`    - ${record.name} (executed: ${record.executed_at})`, 'blue');
        });
      } else {
        log('  ⚠️  No matrix-related migrations found in migrations table', 'yellow');
      }
    } else {
      log('  ⚠️  Migrations table does not exist', 'yellow');
    }

    // Check users with inspektorat role
    log('\nChecking Inspektorat users:', 'yellow');
    const [inspektoratUsers] = await connection.query(
      `SELECT id, username, name, role, institution FROM users WHERE role IN ('inspektorat', 'super_admin')`
    );
    
    if (inspektoratUsers.length > 0) {
      log(`  ✅ Found ${inspektoratUsers.length} Inspektorat/Admin users:`, 'green');
      inspektoratUsers.forEach(user => {
        log(`    - ${user.username} (${user.name}) - ${user.role}`, 'blue');
      });
    } else {
      log('  ❌ No Inspektorat or Admin users found', 'red');
    }

    // Check OPD users
    log('\nChecking OPD users:', 'yellow');
    const [opdUsers] = await connection.query(
      `SELECT COUNT(*) as count, institution FROM users WHERE role = 'opd' GROUP BY institution`
    );
    
    if (opdUsers.length > 0) {
      log(`  ✅ Found OPD users in ${opdUsers.length} institutions:`, 'green');
      opdUsers.forEach(row => {
        log(`    - ${row.institution}: ${row.count} users`, 'blue');
      });
    } else {
      log('  ⚠️  No OPD users found', 'yellow');
    }

    log('\n✅ Database check completed!\n', 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
  } finally {
    if (connection) {
      await connection.end();
      log('Database connection closed', 'blue');
    }
  }
}

checkTables();
