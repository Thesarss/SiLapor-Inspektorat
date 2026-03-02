#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

class DatabaseIntegrityChecker {
  constructor() {
    this.connection = null;
    this.checks = [];
  }

  log(message, type = 'info') {
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    console.log(`${prefix} ${message}`);
  }

  async connect() {
    try {
      // Load environment variables
      const envPath = path.join(__dirname, '..', '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        
        envContent.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            envVars[key.trim()] = value.trim();
          }
        });

        this.connection = await mysql.createConnection({
          host: envVars.DB_HOST || 'localhost',
          user: envVars.DB_USER || 'root',
          password: envVars.DB_PASSWORD || '',
          database: envVars.DB_NAME || 'silapor_db',
          port: parseInt(envVars.DB_PORT) || 3306
        });

        this.log('✅ Database connected successfully');
        return true;
      } else {
        this.log('❌ .env file not found', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkTables() {
    this.log('🔍 Checking database tables...');
    
    const requiredTables = [
      'users',
      'reports', 
      'followup_items',
      'followup_recommendations',
      'revision_items',
      'metrics',
      'file_imports',
      'imported_reports',
      'matrix_templates',
      'matrix_assignments',
      'matrix_assignment_items',
      'matrix_evidence'
    ];

    try {
      const [rows] = await this.connection.execute('SHOW TABLES');
      const existingTables = rows.map(row => Object.values(row)[0]);
      
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        if (existingTables.includes(table)) {
          this.log(`✅ Table '${table}' exists`);
        } else {
          this.log(`❌ Table '${table}' missing`, 'error');
          allTablesExist = false;
        }
      }

      if (allTablesExist) {
        this.log('✅ All required tables exist');
      } else {
        this.log('❌ Some required tables are missing', 'error');
      }

      return allTablesExist;
    } catch (error) {
      this.log(`❌ Error checking tables: ${error.message}`, 'error');
      return false;
    }
  }

  async checkData() {
    this.log('📊 Checking data integrity...');
    
    try {
      // Check users table
      const [userRows] = await this.connection.execute('SELECT COUNT(*) as count FROM users');
      const userCount = userRows[0].count;
      this.log(`📋 Found ${userCount} users in database`);

      if (userCount === 0) {
        this.log('⚠️  No users found. Run seed script to create default users.', 'warning');
      }

      // Check reports table
      const [reportRows] = await this.connection.execute('SELECT COUNT(*) as count FROM reports');
      const reportCount = reportRows[0].count;
      this.log(`📋 Found ${reportCount} reports in database`);

      // Check matrix assignments
      try {
        const [matrixRows] = await this.connection.execute('SELECT COUNT(*) as count FROM matrix_assignments');
        const matrixCount = matrixRows[0].count;
        this.log(`📋 Found ${matrixCount} matrix assignments in database`);
      } catch (error) {
        this.log('⚠️  Matrix tables not accessible (may not be migrated yet)', 'warning');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error checking data: ${error.message}`, 'error');
      return false;
    }
  }

  async checkIndexes() {
    this.log('🔍 Checking database indexes...');
    
    try {
      // Check for important indexes
      const indexChecks = [
        { table: 'users', column: 'username' },
        { table: 'reports', column: 'nomor_lhp' },
        { table: 'reports', column: 'created_by' },
        { table: 'followup_items', column: 'report_id' }
      ];

      for (const check of indexChecks) {
        try {
          const [rows] = await this.connection.execute(
            'SHOW INDEX FROM ?? WHERE Column_name = ?',
            [check.table, check.column]
          );
          
          if (rows.length > 0) {
            this.log(`✅ Index exists on ${check.table}.${check.column}`);
          } else {
            this.log(`⚠️  No index on ${check.table}.${check.column}`, 'warning');
          }
        } catch (error) {
          this.log(`⚠️  Could not check index on ${check.table}.${check.column}`, 'warning');
        }
      }

      return true;
    } catch (error) {
      this.log(`❌ Error checking indexes: ${error.message}`, 'error');
      return false;
    }
  }

  async checkConstraints() {
    this.log('🔗 Checking foreign key constraints...');
    
    try {
      const [rows] = await this.connection.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CONSTRAINT_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      if (rows.length > 0) {
        this.log(`✅ Found ${rows.length} foreign key constraints`);
        rows.forEach(row => {
          this.log(`   ${row.TABLE_NAME}.${row.COLUMN_NAME} -> ${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}`);
        });
      } else {
        this.log('⚠️  No foreign key constraints found', 'warning');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error checking constraints: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllChecks() {
    console.log('🔍 SILAPOR Database Integrity Check');
    console.log('=' .repeat(50));
    
    const connected = await this.connect();
    if (!connected) {
      console.log('\n❌ Cannot proceed without database connection');
      process.exit(1);
    }

    const results = {
      tables: await this.checkTables(),
      data: await this.checkData(),
      indexes: await this.checkIndexes(),
      constraints: await this.checkConstraints()
    };

    console.log('\n' + '=' .repeat(50));
    console.log('📊 INTEGRITY CHECK RESULTS');
    console.log('=' .repeat(50));

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log(`✅ Passed: ${passed}/${total} checks`);
    
    if (passed === total) {
      console.log('🎉 Database integrity is EXCELLENT');
    } else if (passed >= total * 0.75) {
      console.log('⚠️  Database integrity is GOOD (minor issues)');
    } else {
      console.log('❌ Database integrity needs ATTENTION');
    }

    console.log('\n💡 Recommendations:');
    if (!results.tables) {
      console.log('   • Run database migrations: npm run migrate');
    }
    if (!results.data) {
      console.log('   • Run database seeding: npm run seed');
    }
    if (!results.indexes) {
      console.log('   • Consider adding performance indexes');
    }
    if (!results.constraints) {
      console.log('   • Review foreign key constraints');
    }

    await this.connection.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new DatabaseIntegrityChecker();
  checker.runAllChecks().catch(console.error);
}

module.exports = DatabaseIntegrityChecker;