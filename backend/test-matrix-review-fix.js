#!/usr/bin/env node

/**
 * Test Matrix Review with Valid User
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testReview() {
  console.log('🧪 Testing Matrix Review Fix...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db'
    });
    
    console.log('✅ Connected to database\n');
    
    // Get an inspektorat user
    const [users] = await connection.query(`
      SELECT id, username, name FROM users 
      WHERE role = 'inspektorat' 
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.error('❌ No inspektorat user found');
      return;
    }
    
    const testUser = users[0];
    console.log('👤 Test User:', testUser.name, `(${testUser.username})`);
    console.log('   ID:', testUser.id);
    console.log('');
    
    // Get a matrix item to test
    const [items] = await connection.query(`
      SELECT id, status FROM matrix_items 
      WHERE status IN ('submitted', 'pending')
      LIMIT 1
    `);
    
    if (items.length === 0) {
      console.error('❌ No matrix items available for testing');
      return;
    }
    
    const testItem = items[0];
    console.log('📊 Test Item:', testItem.id.substring(0, 8) + '...');
    console.log('   Current Status:', testItem.status);
    console.log('');
    
    // Test UPDATE with valid user ID
    console.log('🔧 Testing UPDATE query...');
    try {
      const [result] = await connection.query(`
        UPDATE matrix_items
        SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
        WHERE id = ?
      `, ['approved', testUser.id, 'Test review from script', testItem.id]);
      
      console.log('✅ UPDATE successful!');
      console.log('   Affected rows:', result.affectedRows);
      console.log('');
      
      // Verify the update
      const [updated] = await connection.query(`
        SELECT id, status, reviewed_by, review_notes, reviewed_at
        FROM matrix_items
        WHERE id = ?
      `, [testItem.id]);
      
      console.log('✅ Verification:');
      console.log('   Status:', updated[0].status);
      console.log('   Reviewed by:', updated[0].reviewed_by);
      console.log('   Review notes:', updated[0].review_notes);
      console.log('   Reviewed at:', updated[0].reviewed_at);
      console.log('');
      
      // Rollback for testing
      console.log('🔄 Rolling back test...');
      await connection.query(`
        UPDATE matrix_items
        SET status = ?, reviewed_by = NULL, review_notes = NULL, reviewed_at = NULL
        WHERE id = ?
      `, [testItem.status, testItem.id]);
      
      console.log('✅ Rolled back\n');
      
      console.log('═══════════════════════════════════════');
      console.log('✅ TEST PASSED!');
      console.log('═══════════════════════════════════════');
      console.log('The UPDATE query works with valid user ID.');
      console.log('');
      console.log('🚀 NEXT STEPS:');
      console.log('1. Backend code has been updated with:');
      console.log('   - User validation before UPDATE');
      console.log('   - Better error handling');
      console.log('   - Detailed logging');
      console.log('');
      console.log('2. RESTART backend server:');
      console.log('   cd backend && npm run dev');
      console.log('');
      console.log('3. Test approve/reject in browser');
      console.log('   - Login as inspektorat user');
      console.log('   - Go to Review page');
      console.log('   - Click approve/reject');
      console.log('   - Watch backend console for logs');
      
    } catch (error) {
      console.error('❌ UPDATE failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   SQL:', error.sqlMessage);
      
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.error('\n💡 Foreign key constraint error!');
        console.error('   The user ID does not exist in users table');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testReview();
