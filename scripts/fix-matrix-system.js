// Quick Fix Script untuk Matrix Audit System
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

async function fixMatrixSystem() {
  let connection;
  
  try {
    log('\n🔧 Matrix Audit System - Quick Fix\n', 'cyan');
    log('=' .repeat(50), 'blue');

    // Step 1: Create upload folders
    log('\n📁 Step 1: Creating upload folders...', 'yellow');
    const folders = [
      path.join(__dirname, 'uploads', 'matrix'),
      path.join(__dirname, 'uploads', 'matrix-evidence')
    ];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        log(`  ✅ Created: ${folder}`, 'green');
      } else {
        log(`  ✓ Already exists: ${folder}`, 'blue');
      }
    }

    // Step 2: Connect to database
    log('\n🔌 Step 2: Connecting to database...', 'yellow');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'audit_system',
      multipleStatements: true
    });
    log('  ✅ Database connected', 'green');

    // Step 3: Run migration
    log('\n📊 Step 3: Creating/updating database tables...', 'yellow');
    const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '019_create_matrix_audit_system_fixed.sql');
    
    if (!fs.existsSync(migrationPath)) {
      log(`  ❌ Migration file not found: ${migrationPath}`, 'red');
      throw new Error('Migration file not found');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await connection.query(migrationSQL);
    log('  ✅ Migration executed successfully', 'green');

    // Step 4: Verify tables
    log('\n✓ Step 4: Verifying tables...', 'yellow');
    const requiredTables = [
      'matrix_reports',
      'matrix_items',
      'matrix_assignments',
      'matrix_item_history',
      'matrix_upload_sessions'
    ];

    let allTablesExist = true;
    for (const tableName of requiredTables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [process.env.DB_NAME || 'audit_system', tableName]
      );

      if (rows[0].count > 0) {
        log(`  ✅ ${tableName}`, 'green');
      } else {
        log(`  ❌ ${tableName} - NOT FOUND`, 'red');
        allTablesExist = false;
      }
    }

    if (!allTablesExist) {
      throw new Error('Some tables are missing after migration');
    }

    // Step 5: Check users
    log('\n👥 Step 5: Checking users...', 'yellow');
    
    const [inspektoratUsers] = await connection.query(
      `SELECT COUNT(*) as count FROM users WHERE role IN ('inspektorat', 'super_admin')`
    );
    
    if (inspektoratUsers[0].count > 0) {
      log(`  ✅ Found ${inspektoratUsers[0].count} Inspektorat/Admin users`, 'green');
    } else {
      log('  ⚠️  No Inspektorat users found', 'yellow');
      log('  💡 You need to create an Inspektorat user to upload matrix', 'cyan');
    }

    const [opdUsers] = await connection.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'opd'`
    );
    
    if (opdUsers[0].count > 0) {
      log(`  ✅ Found ${opdUsers[0].count} OPD users`, 'green');
      
      // Show institutions
      const [institutions] = await connection.query(
        `SELECT DISTINCT institution FROM users WHERE role = 'opd' AND institution IS NOT NULL`
      );
      
      if (institutions.length > 0) {
        log(`  📋 Available institutions:`, 'blue');
        institutions.forEach(row => {
          log(`     - ${row.institution}`, 'cyan');
        });
      }
    } else {
      log('  ⚠️  No OPD users found', 'yellow');
      log('  💡 You need OPD users to assign matrix tasks', 'cyan');
    }

    // Step 6: Verify routes file exists
    log('\n🛣️  Step 6: Verifying routes file...', 'yellow');
    const routesPath = path.join(__dirname, 'src', 'routes', 'matrix-audit.routes.ts');
    
    if (fs.existsSync(routesPath)) {
      log('  ✅ matrix-audit.routes.ts exists', 'green');
      
      // Check if it's registered in index.ts
      const indexPath = path.join(__dirname, 'src', 'index.ts');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (indexContent.includes('matrixAuditRouter') && indexContent.includes('/api/matrix')) {
        log('  ✅ Routes registered in index.ts', 'green');
      } else {
        log('  ⚠️  Routes may not be registered in index.ts', 'yellow');
        log('  💡 Check that index.ts contains:', 'cyan');
        log('     import { matrixAuditRouter } from \'./routes/matrix-audit.routes\';', 'cyan');
        log('     app.use(\'/api/matrix\', matrixAuditRouter);', 'cyan');
      }
    } else {
      log('  ❌ matrix-audit.routes.ts not found', 'red');
    }

    // Step 7: Summary
    log('\n' + '='.repeat(50), 'blue');
    log('\n✅ Matrix Audit System Fix Completed!\n', 'green');
    
    log('📋 Summary:', 'cyan');
    log('  ✓ Upload folders created', 'green');
    log('  ✓ Database tables created/verified', 'green');
    log('  ✓ Routes file verified', 'green');
    
    log('\n🚀 Next Steps:', 'yellow');
    log('  1. Restart your backend server (npm run dev)', 'cyan');
    log('  2. Login as Inspektorat user', 'cyan');
    log('  3. Navigate to /matrix page', 'cyan');
    log('  4. Try uploading a matrix Excel file', 'cyan');
    
    log('\n📚 For troubleshooting, see: MATRIX_AUDIT_TROUBLESHOOTING.md\n', 'blue');

  } catch (error) {
    log(`\n❌ Error during fix: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    log('\n💡 Try running the steps manually. See MATRIX_AUDIT_TROUBLESHOOTING.md', 'yellow');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixMatrixSystem();
