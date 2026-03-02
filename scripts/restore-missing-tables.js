// Script untuk restore tabel yang hilang
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

async function restoreMissingTables() {
  let connection;
  
  try {
    log('\n🔧 Restoring Missing Tables\n', 'cyan');
    log('=' .repeat(60), 'blue');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'audit_system',
      multipleStatements: true
    });

    log('\n✅ Database connected', 'green');

    // Check which tables are missing
    const tablesToCheck = [
      { name: 'followup_recommendations', migration: '012_add_followup_item_recommendations.sql' },
      { name: 'report_files', migration: '002_add_report_files.sql' }
    ];

    log('\n📋 Checking tables...', 'yellow');
    
    for (const table of tablesToCheck) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME || 'audit_system', table.name]
      );

      if (rows[0].count === 0) {
        log(`  ❌ ${table.name} - MISSING`, 'red');
        
        // Try to restore from migration
        const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', table.migration);
        
        if (fs.existsSync(migrationPath)) {
          log(`  🔧 Restoring from ${table.migration}...`, 'yellow');
          
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await connection.query(sql);
          
          log(`  ✅ ${table.name} restored successfully`, 'green');
        } else {
          log(`  ⚠️  Migration file not found: ${table.migration}`, 'yellow');
          log(`  💡 Creating table manually...`, 'cyan');
          
          // Create table manually based on known schema
          if (table.name === 'followup_recommendations') {
            await connection.query(`
              CREATE TABLE IF NOT EXISTS followup_recommendations (
                id VARCHAR(36) PRIMARY KEY,
                followup_item_id VARCHAR(36) NOT NULL,
                recommendation_text TEXT NOT NULL,
                status ENUM('pending', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                assigned_to VARCHAR(36),
                due_date DATE,
                completion_date DATE,
                notes TEXT,
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (followup_item_id) REFERENCES followup_items(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_followup_recommendations_item (followup_item_id),
                INDEX idx_followup_recommendations_status (status),
                INDEX idx_followup_recommendations_assigned (assigned_to)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            log(`  ✅ followup_recommendations created`, 'green');
          }
          
          if (table.name === 'report_files') {
            await connection.query(`
              CREATE TABLE IF NOT EXISTS report_files (
                id VARCHAR(36) PRIMARY KEY,
                report_id VARCHAR(36) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INT NOT NULL,
                mime_type VARCHAR(100),
                uploaded_by VARCHAR(36) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_report_files_report (report_id),
                INDEX idx_report_files_uploaded_by (uploaded_by)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            log(`  ✅ report_files created`, 'green');
          }
        }
      } else {
        log(`  ✅ ${table.name} - EXISTS`, 'green');
      }
    }

    // Verify all tables now exist
    log('\n✓ Verifying tables...', 'yellow');
    
    let allTablesExist = true;
    for (const table of tablesToCheck) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME || 'audit_system', table.name]
      );

      if (rows[0].count > 0) {
        log(`  ✅ ${table.name} verified`, 'green');
      } else {
        log(`  ❌ ${table.name} still missing`, 'red');
        allTablesExist = false;
      }
    }

    log('\n' + '='.repeat(60), 'blue');
    
    if (allTablesExist) {
      log('\n✅ All tables restored successfully!\n', 'green');
    } else {
      log('\n⚠️  Some tables could not be restored\n', 'yellow');
      log('💡 Try running: run-all-migrations.bat\n', 'cyan');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

restoreMissingTables();
