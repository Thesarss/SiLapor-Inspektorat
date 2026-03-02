#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function cleanMatrixEvidence() {
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
    console.log('🧹 Cleaning matrix and evidence data...\n');

    // Clean evidence files
    try {
      const [evidenceCount] = await connection.execute('SELECT COUNT(*) as count FROM evidence_files');
      console.log(`📋 Found ${evidenceCount[0].count} evidence files`);
      
      await connection.execute('DELETE FROM evidence_files');
      console.log('✅ Cleaned evidence_files table');
    } catch (error) {
      console.log('⚠️  Evidence files table not found or error:', error.message);
    }

    // Clean evidence tags
    try {
      await connection.execute('DELETE FROM evidence_file_tags');
      console.log('✅ Cleaned evidence_file_tags table');
    } catch (error) {
      console.log('⚠️  Evidence file tags table not found');
    }

    try {
      await connection.execute('DELETE FROM evidence_tags');
      console.log('✅ Cleaned evidence_tags table');
    } catch (error) {
      console.log('⚠️  Evidence tags table not found');
    }

    // Clean matrix data
    try {
      const [matrixItemsCount] = await connection.execute('SELECT COUNT(*) as count FROM matrix_items');
      console.log(`📋 Found ${matrixItemsCount[0].count} matrix items`);
      
      await connection.execute('DELETE FROM matrix_items');
      console.log('✅ Cleaned matrix_items table');
    } catch (error) {
      console.log('⚠️  Matrix items table not found or error:', error.message);
    }

    try {
      const [assignmentsCount] = await connection.execute('SELECT COUNT(*) as count FROM matrix_assignments');
      console.log(`📋 Found ${assignmentsCount[0].count} matrix assignments`);
      
      await connection.execute('DELETE FROM matrix_assignments');
      console.log('✅ Cleaned matrix_assignments table');
    } catch (error) {
      console.log('⚠️  Matrix assignments table not found or error:', error.message);
    }

    try {
      const [reportsCount] = await connection.execute('SELECT COUNT(*) as count FROM matrix_reports');
      console.log(`📋 Found ${reportsCount[0].count} matrix reports`);
      
      await connection.execute('DELETE FROM matrix_reports');
      console.log('✅ Cleaned matrix_reports table');
    } catch (error) {
      console.log('⚠️  Matrix reports table not found or error:', error.message);
    }

    // Clean test data we created earlier
    try {
      await connection.execute('DELETE FROM follow_ups WHERE content LIKE "%Test follow-up content%"');
      await connection.execute('DELETE FROM followup_item_recommendations WHERE recommendation_text LIKE "%Test recommendation%"');
      console.log('✅ Cleaned test review data');
    } catch (error) {
      console.log('⚠️  Error cleaning test data:', error.message);
    }

    // Clean uploaded files from filesystem
    const uploadsDir = path.join(__dirname, 'uploads');
    const matrixUploadsDir = path.join(uploadsDir, 'matrix');
    const evidenceUploadsDir = path.join(uploadsDir, 'evidence');
    const matrixEvidenceDir = path.join(uploadsDir, 'matrix-evidence');

    [matrixUploadsDir, evidenceUploadsDir, matrixEvidenceDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          });
          console.log(`✅ Cleaned files from ${dir}`);
        } catch (error) {
          console.log(`⚠️  Error cleaning ${dir}:`, error.message);
        }
      }
    });

    console.log('\n🎉 Database cleanup completed!');
    console.log('📋 Summary:');
    console.log('   - Matrix reports, assignments, and items cleared');
    console.log('   - Evidence files and related data cleared');
    console.log('   - Test review data removed');
    console.log('   - Upload directories cleaned');
    console.log('\n✨ Ready for fresh matrix and evidence workflow!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

cleanMatrixEvidence();