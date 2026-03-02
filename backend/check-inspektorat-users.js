#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  console.log('🔍 Checking Inspektorat Users...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'inspektorat_db'
    });
    
    console.log('✅ Connected to database\n');
    
    // Get all inspektorat users
    const [users] = await connection.query(`
      SELECT id, username, name, role, institution, status
      FROM users
      WHERE role = 'inspektorat' OR role = 'super_admin'
      ORDER BY role, username
    `);
    
    if (users.length === 0) {
      console.error('❌ No inspektorat or super_admin users found!');
      console.log('\n💡 Solution: Create inspektorat user first');
      console.log('   Run: cd backend && npm run seed:users');
    } else {
      console.log(`✅ Found ${users.length} inspektorat/admin users:\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.name})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status || 'active'}`);
        console.log('');
      });
    }
    
    // Get all users for reference
    const [allUsers] = await connection.query(`
      SELECT id, username, role FROM users ORDER BY role, username
    `);
    
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    console.log('Breakdown by role:');
    const roleCount = {};
    allUsers.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    });
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsers();
