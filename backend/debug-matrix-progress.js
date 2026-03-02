#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function debugMatrixProgress() {
  let connection;
  
  try {
    // Load environment variables
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST || 'localhost',
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD || '',
      database: envVars.DB_NAME || 'evaluation_reporting',
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('✅ Database connected');
    console.log('🔍 Debugging Matrix Progress data...\n');

    // Check users
    console.log('1. 👤 USERS:');
    const [users] = await connection.execute('SELECT id, name, email, role, institution FROM users');
    users.forEach(user => {
      console.log(`   ${user.role}: ${user.name} (${user.email}) - ${user.institution || 'No institution'}`);
    });

    // Check matrix reports
    console.log('\n2. 📋 MATRIX REPORTS:');
    const [reports] = await connection.execute('SELECT * FROM matrix_reports');
    reports.forEach(report => {
      console.log(`   ${report.id}: ${report.title} → ${report.target_opd} (by ${report.uploaded_by})`);
    });

    // Check matrix assignments
    console.log('\n3. 📝 MATRIX ASSIGNMENTS:');
    const [assignments] = await connection.execute(`
      SELECT ma.*, mr.title, u.name as assigned_to_name, u2.name as assigned_by_name
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      JOIN users u2 ON ma.assigned_by = u2.id
    `);
    assignments.forEach(assignment => {
      console.log(`   ${assignment.id}: ${assignment.title}`);
      console.log(`     Assigned to: ${assignment.assigned_to_name}`);
      console.log(`     Assigned by: ${assignment.assigned_by_name}`);
      console.log(`     Status: ${assignment.status}`);
      console.log(`     Progress: ${assignment.progress_percentage || 0}%`);
      console.log('');
    });

    // Check matrix items
    console.log('4. 📊 MATRIX ITEMS:');
    const [items] = await connection.execute('SELECT * FROM matrix_items');
    items.forEach(item => {
      console.log(`   Item #${item.item_number}: ${item.temuan.substring(0, 50)}...`);
      console.log(`     Status: ${item.status}`);
      console.log(`     Evidence: ${item.evidence_submitted ? 'Yes' : 'No'} (${item.evidence_count || 0} files)`);
      console.log('');
    });

    // Test the matrix_progress_view
    console.log('5. 🔍 MATRIX PROGRESS VIEW:');
    try {
      const [progressView] = await connection.execute('SELECT * FROM matrix_progress_view');
      if (progressView.length === 0) {
        console.log('   ❌ No data in matrix_progress_view');
      } else {
        progressView.forEach(progress => {
          console.log(`   Assignment: ${progress.matrix_title}`);
          console.log(`     OPD: ${progress.opd_user_name} (${progress.opd_institution})`);
          console.log(`     Progress: ${progress.progress_percentage}%`);
          console.log(`     Items with evidence: ${progress.items_with_evidence}/${progress.total_items}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log(`   ❌ Error accessing matrix_progress_view: ${error.message}`);
    }

    // Get inspektorat user for API test
    const inspektoratUser = users.find(u => u.role === 'inspektorat');
    if (inspektoratUser) {
      console.log(`6. 🧪 API TEST DATA for user: ${inspektoratUser.name} (${inspektoratUser.id})`);
      
      // Test the actual query used in API
      const [apiData] = await connection.execute(`
        SELECT * FROM matrix_progress_view 
        WHERE assigned_by = ?
        ORDER BY last_activity_at DESC, assigned_at DESC
      `, [inspektoratUser.id]);
      
      console.log(`   API would return ${apiData.length} records`);
      apiData.forEach(data => {
        console.log(`     - ${data.matrix_title}: ${data.progress_percentage}%`);
      });
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

debugMatrixProgress();