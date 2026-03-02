#!/usr/bin/env node

/**
 * Fix Matrix Review Issue
 * Diagnose and fix the 500 error when approving matrix items
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function diagnoseAndFix() {
  console.log('🔍 Diagnosing Matrix Review Issue\n');
  
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db'
    });
    
    console.log('✅ Connected to database\n');
    
    // Check 1: Does matrix_items table exist?
    console.log('📋 Check 1: Table Existence');
    console.log('─────────────────────────────');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'matrix_items'
    `);
    
    if (tables.length === 0) {
      console.error('❌ Table "matrix_items" does NOT exist!');
      console.log('\n💡 Solution: Run matrix migration:');
      console.log('   cd backend && node run-matrix-migration.bat');
      return;
    }
    
    console.log('✅ Table "matrix_items" exists\n');
    
    // Check 2: Table structure
    console.log('📋 Check 2: Table Structure');
    console.log('─────────────────────────────');
    const [columns] = await connection.query(`
      DESCRIBE matrix_items
    `);
    
    const requiredColumns = ['id', 'status', 'reviewed_by', 'review_notes', 'reviewed_at'];
    const existingColumns = columns.map(col => col.Field);
    
    console.log('Existing columns:', existingColumns.join(', '));
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '));
      console.log('\n💡 Solution: Run matrix migration again');
      return;
    }
    
    console.log('✅ All required columns exist\n');
    
    // Check 3: Check status column type
    console.log('📋 Check 3: Status Column Type');
    console.log('─────────────────────────────');
    const statusColumn = columns.find(col => col.Field === 'status');
    console.log('Status column type:', statusColumn.Type);
    
    if (!statusColumn.Type.includes('enum') && !statusColumn.Type.includes('varchar')) {
      console.error('❌ Status column has wrong type:', statusColumn.Type);
      console.log('\n💡 Solution: Alter table to fix status column');
      
      await connection.query(`
        ALTER TABLE matrix_items 
        MODIFY COLUMN status ENUM('pending', 'submitted', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log('✅ Fixed status column type');
    } else {
      console.log('✅ Status column type is correct\n');
    }
    
    // Check 4: Sample data
    console.log('📋 Check 4: Sample Data');
    console.log('─────────────────────────────');
    const [items] = await connection.query(`
      SELECT id, status, reviewed_by, reviewed_at, created_at 
      FROM matrix_items 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (items.length === 0) {
      console.log('⚠️  No matrix items found in database');
      console.log('💡 Create test data or upload a matrix file first');
    } else {
      console.log(`✅ Found ${items.length} matrix items:`);
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id.substring(0, 8)}... Status: ${item.status}`);
      });
    }
    
    console.log('');
    
    // Check 5: Test UPDATE query
    console.log('📋 Check 5: Test UPDATE Query');
    console.log('─────────────────────────────');
    
    if (items.length > 0) {
      const testItemId = items[0].id;
      const testUserId = '00000000-0000-0000-0000-000000000001'; // Dummy user ID
      
      try {
        const [result] = await connection.query(`
          UPDATE matrix_items
          SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
          WHERE id = ?
        `, ['approved', testUserId, 'Test review', testItemId]);
        
        console.log('✅ UPDATE query works!');
        console.log('   Affected rows:', result.affectedRows);
        
        // Rollback the test
        await connection.query(`
          UPDATE matrix_items
          SET status = ?, reviewed_by = NULL, review_notes = NULL, reviewed_at = NULL
          WHERE id = ?
        `, [items[0].status, testItemId]);
        
        console.log('✅ Test rolled back\n');
      } catch (error) {
        console.error('❌ UPDATE query failed:', error.message);
        console.log('\n💡 This is the root cause of the 500 error!');
      }
    }
    
    // Check 6: Foreign key constraints
    console.log('📋 Check 6: Foreign Key Constraints');
    console.log('─────────────────────────────');
    const [constraints] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'matrix_items'
        AND TABLE_SCHEMA = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME || 'inspektorat_db']);
    
    if (constraints.length > 0) {
      console.log('✅ Foreign key constraints:');
      constraints.forEach(c => {
        console.log(`   ${c.COLUMN_NAME} -> ${c.REFERENCED_TABLE_NAME}.${c.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('⚠️  No foreign key constraints found');
    }
    
    console.log('\n');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('✅ Database connection: OK');
    console.log('✅ Table exists: OK');
    console.log('✅ Table structure: OK');
    console.log(`${items.length > 0 ? '✅' : '⚠️ '} Sample data: ${items.length} items`);
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Check backend console for detailed error logs');
    console.log('3. Try approve/reject again');
    console.log('4. If still fails, check backend console output');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('1. Database not running (start XAMPP MySQL)');
    console.error('2. Wrong database credentials in backend/.env');
    console.error('3. Database not created yet');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnoseAndFix();
