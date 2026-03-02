#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function checkSystemStatus() {
  console.log('🔍 SYSTEM STATUS CHECK');
  console.log('='.repeat(50));
  
  // 1. Check Backend
  console.log('\n1. 🖥️  BACKEND STATUS:');
  try {
    const backendResponse = await axios.get('http://localhost:3000');
    console.log('   ✅ Backend running on port 3000');
    console.log('   📊 Status:', backendResponse.status);
  } catch (error) {
    console.log('   ❌ Backend not accessible');
    console.log('   🔧 Error:', error.code || error.message);
  }
  
  // 2. Check Frontend
  console.log('\n2. 🌐 FRONTEND STATUS:');
  try {
    const frontendResponse = await axios.get('http://localhost:5173');
    console.log('   ✅ Frontend running on port 5173');
    console.log('   📊 Status:', frontendResponse.status);
  } catch (error) {
    console.log('   ❌ Frontend not accessible');
    console.log('   🔧 Error:', error.code || error.message);
  }
  
  // 3. Check Database
  console.log('\n3. 🗄️  DATABASE STATUS:');
  try {
    // Load environment variables
    const envPath = path.join(__dirname, 'backend', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    const connection = await mysql.createConnection({
      host: envVars.DB_HOST || 'localhost',
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD || '',
      database: envVars.DB_NAME || 'evaluation_reporting',
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('   ✅ Database connection successful');
    
    // Check key tables
    const tables = ['users', 'matrix_reports', 'matrix_items', 'matrix_assignments', 'evidence_files'];
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   📋 ${table}: ${rows[0].count} records`);
      } catch (error) {
        console.log(`   ❌ ${table}: Table not found or error`);
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.log('   ❌ Database connection failed');
    console.log('   🔧 Error:', error.message);
    console.log('   💡 Check if XAMPP MySQL is running');
  }
  
  // 4. Check Test Data
  console.log('\n4. 📊 TEST DATA STATUS:');
  try {
    const envPath = path.join(__dirname, 'backend', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    const connection = await mysql.createConnection({
      host: envVars.DB_HOST || 'localhost',
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD || '',
      database: envVars.DB_NAME || 'evaluation_reporting',
      port: parseInt(envVars.DB_PORT) || 3306
    });

    // Check users by role
    const [inspektoratUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['inspektorat']);
    const [opdUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['opd']);
    
    console.log(`   👤 Inspektorat users: ${inspektoratUsers[0].count}`);
    console.log(`   🏢 OPD users: ${opdUsers[0].count}`);
    
    // Check matrix data
    const [matrixReports] = await connection.execute('SELECT COUNT(*) as count FROM matrix_reports');
    const [matrixAssignments] = await connection.execute('SELECT COUNT(*) as count FROM matrix_assignments');
    
    console.log(`   📋 Matrix reports: ${matrixReports[0].count}`);
    console.log(`   📝 Matrix assignments: ${matrixAssignments[0].count}`);
    
    await connection.end();
    
  } catch (error) {
    console.log('   ❌ Cannot check test data');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 NEXT STEPS:');
  console.log('   1. Open http://localhost:5173 in browser');
  console.log('   2. Login with test users');
  console.log('   3. Check browser console (F12) for errors');
  console.log('   4. Report specific error messages');
}

checkSystemStatus();