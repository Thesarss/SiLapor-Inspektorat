#!/usr/bin/env node

/**
 * Check Matrix Table - Using Backend Database Connection
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMatrixTable() {
  console.log('🔍 Checking Matrix Table...\n');
  
  let connection;
  
  try {
    // Connect using backend's database config
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db'
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME || 'inspektorat_db');
    console.log('');
    
    // Check 1: Table exists
    console.log('📋 Check 1: Table Existence');
    console.log('─────────────────────────────');
    const [tables] = await connection.query(`SHOW TABLES LIKE 'matrix_items'`);
    
    if (tables.length === 0) {
      console.error('❌ Table "matrix_items" does NOT exist!');
      console.log('\n💡 Solution: Run matrix migration');
      console.log('   cd backend');
      console.log('   Run the migration file manually in MySQL');
      await connection.end();
      return;
    }
    
    console.log('✅ Table "matrix_items" exists\n');
    
    // Check 2: Table structure
    console.log('📋 Check 2: Table Structure');
    console.log('─────────────────────────────');
    const [columns] = await connection.query(`DESCRIBE matrix_items`);
    
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');
    
    // Check required columns
    const requiredColumns = ['id', 'status', 'reviewed_by', 'review_notes', 'reviewed_at'];
    const existingColumns = columns.map(col => col.Field);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '));
      console.log('\n💡 Solution: Run matrix migration again');
      await connection.end();
      return;
    }
    
    console.log('✅ All required columns exist\n');
    
    // Check 3: Sample data
    console.log('📋 Check 3: Sample Data');
    console.log('─────────────────────────────');
    const [items] = await connection.query(`
      SELECT id, status, reviewed_by, reviewed_at, created_at 
      FROM matrix_items 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (items.length === 0) {
      console.log('⚠️  No matrix items found');
      console.log('💡 Upload a matrix file first or create test data');
    } else {
      console.log(`✅ Found ${items.length} matrix items:`);
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id.substring(0, 8)}...`);
        console.log(`      Status: ${item.status}`);
        console.log(`      Reviewed: ${item.reviewed_by ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('');
    
    // Check 4: Test UPDATE
    if (items.length > 0) {
      console.log('📋 Check 4: Test UPDATE Query');
      console.log('─────────────────────────────');
      
      const testItemId = items[0].id;
      const originalStatus = items[0].status;
      
      try {
        // Test update
        await connection.query(`
          UPDATE matrix_items
          SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
          WHERE id = ?
        `, ['approved', 'test-user-id', 'Test review', testItemId]);
        
        console.log('✅ UPDATE query works!');
        
        // Rollback
        await connection.query(`
          UPDATE matrix_items
          SET status = ?, reviewed_by = NULL, review_notes = NULL, reviewed_at = NULL
          WHERE id = ?
        `, [originalStatus, testItemId]);
        
        console.log('✅ Test rolled back\n');
      } catch (error) {
        console.error('❌ UPDATE query failed:', error.message);
        console.log('\n💡 This is the root cause of 500 error!');
      }
    }
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('✅ Database connection: OK');
    console.log('✅ Table exists: OK');
    console.log('✅ Table structure: OK');
    console.log(`${items.length > 0 ? '✅' : '⚠️ '} Sample data: ${items.length} items`);
    console.log('');
    
    if (items.length === 0) {
      console.log('⚠️  WARNING: No matrix items in database');
      console.log('   Upload a matrix file first before testing approve/reject');
    } else {
      console.log('✅ Database is ready for approve/reject testing');
      console.log('');
      console.log('🚀 NEXT STEPS:');
      console.log('1. Restart backend server');
      console.log('2. Test approve/reject in browser');
      console.log('3. Watch backend console for detailed logs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('1. XAMPP MySQL not running');
    console.error('2. Wrong database credentials in backend/.env');
    console.error('3. Database not created');
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n❌ Database does not exist!');
      console.error('💡 Create database first:');
      console.error('   CREATE DATABASE inspektorat_db;');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMatrixTable();
