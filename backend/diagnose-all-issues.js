#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script
 * Check all potential issues
 */

const mysql = require('mysql2/promise');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function diagnoseAll() {
  console.log('🔍 COMPREHENSIVE SYSTEM DIAGNOSTIC\n');
  console.log('═══════════════════════════════════════\n');
  
  let connection;
  let allChecks = {
    backend: false,
    database: false,
    view: false,
    tables: false,
    data: false
  };
  
  try {
    // Check 1: Backend Running
    console.log('📋 Check 1: Backend Server');
    console.log('─────────────────────────────');
    
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/health', (res) => {
          if (res.statusCode === 200) {
            console.log('✅ Backend is running on port 3000');
            allChecks.backend = true;
            resolve();
          } else {
            console.log('⚠️  Backend responded but with status:', res.statusCode);
            reject();
          }
        });
        req.on('error', () => {
          console.log('❌ Backend is NOT running');
          console.log('💡 Start backend: cd backend && npm run dev');
          reject();
        });
        req.setTimeout(2000, () => {
          console.log('❌ Backend timeout');
          reject();
        });
      });
    } catch (e) {
      // Backend not running
    }
    
    console.log('');
    
    // Check 2: Database Connection
    console.log('📋 Check 2: Database Connection');
    console.log('─────────────────────────────');
    
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'inspektorat_db'
      });
      
      console.log('✅ Database connected:', process.env.DB_NAME || 'evaluation_reporting');
      allChecks.database = true;
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('💡 Check XAMPP MySQL is running');
      return;
    }
    
    console.log('');
    
    // Check 3: View Exists
    console.log('📋 Check 3: matrix_evidence_tracking View');
    console.log('─────────────────────────────');
    
    const [views] = await connection.query(`
      SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_${process.env.DB_NAME || 'evaluation_reporting'} LIKE 'matrix_evidence_tracking'
    `);
    
    if (views.length > 0) {
      console.log('✅ View exists');
      allChecks.view = true;
      
      // Test view query
      try {
        const [testView] = await connection.query('SELECT * FROM matrix_evidence_tracking LIMIT 1');
        console.log('✅ View query works');
      } catch (error) {
        console.log('❌ View query error:', error.message);
        console.log('💡 Recreate view: cd backend && node fix-evidence-tracking-view.js');
      }
    } else {
      console.log('❌ View does NOT exist');
      console.log('💡 Create view: cd backend && node fix-evidence-tracking-view.js');
    }
    
    console.log('');
    
    // Check 4: Required Tables
    console.log('📋 Check 4: Required Tables');
    console.log('─────────────────────────────');
    
    const requiredTables = [
      'matrix_items',
      'matrix_reports',
      'matrix_assignments',
      'evidence_files',
      'users'
    ];
    
    let allTablesExist = true;
    for (const table of requiredTables) {
      const [tables] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (tables.length > 0) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table} - MISSING!`);
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      allChecks.tables = true;
    } else {
      console.log('\n💡 Run migrations to create missing tables');
    }
    
    console.log('');
    
    // Check 5: Sample Data
    console.log('📋 Check 5: Sample Data');
    console.log('─────────────────────────────');
    
    const [matrixItems] = await connection.query('SELECT COUNT(*) as count FROM matrix_items');
    const [matrixReports] = await connection.query('SELECT COUNT(*) as count FROM matrix_reports');
    const [assignments] = await connection.query('SELECT COUNT(*) as count FROM matrix_assignments');
    const [evidence] = await connection.query('SELECT COUNT(*) as count FROM evidence_files');
    
    console.log(`Matrix Items: ${matrixItems[0].count}`);
    console.log(`Matrix Reports: ${matrixReports[0].count}`);
    console.log(`Matrix Assignments: ${assignments[0].count}`);
    console.log(`Evidence Files: ${evidence[0].count}`);
    
    if (matrixItems[0].count > 0) {
      allChecks.data = true;
      console.log('✅ Data exists');
    } else {
      console.log('⚠️  No data found');
      console.log('💡 Upload a matrix file or create test data');
    }
    
    console.log('');
    
    // Check 6: User Assignments
    console.log('📋 Check 6: User Assignments');
    console.log('─────────────────────────────');
    
    const [userAssignments] = await connection.query(`
      SELECT 
        u.username,
        u.name,
        COUNT(ma.id) as assignment_count
      FROM users u
      LEFT JOIN matrix_assignments ma ON u.id = ma.assigned_to
      WHERE u.role = 'opd'
      GROUP BY u.id
      HAVING assignment_count > 0
      ORDER BY assignment_count DESC
      LIMIT 5
    `);
    
    if (userAssignments.length > 0) {
      console.log(`✅ Found ${userAssignments.length} users with assignments:`);
      userAssignments.forEach(u => {
        console.log(`   - ${u.name} (${u.username}): ${u.assignment_count} assignments`);
      });
    } else {
      console.log('⚠️  No users have matrix assignments');
      console.log('💡 Assign matrix to OPD users first');
    }
    
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Backend Running: ${allChecks.backend ? '✅' : '❌'}`);
    console.log(`Database Connected: ${allChecks.database ? '✅' : '❌'}`);
    console.log(`View Exists: ${allChecks.view ? '✅' : '❌'}`);
    console.log(`Tables Exist: ${allChecks.tables ? '✅' : '❌'}`);
    console.log(`Data Available: ${allChecks.data ? '✅' : '⚠️ '}`);
    console.log('');
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('─────────────────────────────');
    
    if (!allChecks.backend) {
      console.log('1. ❌ START BACKEND: cd backend && npm run dev');
    } else {
      console.log('1. ✅ Backend is running');
    }
    
    if (!allChecks.view) {
      console.log('2. ❌ CREATE VIEW: cd backend && node fix-evidence-tracking-view.js');
    } else {
      console.log('2. ✅ View is ready');
    }
    
    if (!allChecks.data) {
      console.log('3. ⚠️  UPLOAD DATA: Upload matrix file or create test data');
    } else {
      console.log('3. ✅ Data is available');
    }
    
    if (allChecks.backend && allChecks.database && allChecks.view && allChecks.tables) {
      console.log('');
      console.log('🎉 SYSTEM IS READY!');
      console.log('   All critical components are working.');
      console.log('   If still seeing errors, try:');
      console.log('   - Clear browser cache (Ctrl+Shift+Delete)');
      console.log('   - Refresh page (F5)');
      console.log('   - Check browser console for errors');
    } else {
      console.log('');
      console.log('⚠️  SYSTEM NOT READY');
      console.log('   Fix the issues above before testing');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnoseAll();
