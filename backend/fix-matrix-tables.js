#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function fixMatrixTables() {
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
    console.log('🔄 Fixing matrix tables...\n');

    // Add missing columns to evidence_files
    const evidenceColumns = [
      'ADD COLUMN assignment_id VARCHAR(36) NULL AFTER matrix_item_id',
      'MODIFY COLUMN status ENUM("pending", "submitted", "approved", "rejected", "needs_revision") DEFAULT "pending"'
    ];

    for (const column of evidenceColumns) {
      try {
        await connection.execute(`ALTER TABLE evidence_files ${column}`);
        console.log(`✅ Evidence files: ${column}`);
      } catch (error) {
        if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
          console.log(`⚠️  Evidence files: ${column} (already exists)`);
        } else {
          console.log(`❌ Evidence files: ${column} - ${error.message}`);
        }
      }
    }

    // Add missing columns to matrix_items
    const matrixItemColumns = [
      'ADD COLUMN evidence_submitted BOOLEAN DEFAULT FALSE AFTER evidence_file_size',
      'ADD COLUMN evidence_count INT DEFAULT 0 AFTER evidence_submitted',
      'ADD COLUMN last_evidence_at TIMESTAMP NULL AFTER evidence_count'
    ];

    for (const column of matrixItemColumns) {
      try {
        await connection.execute(`ALTER TABLE matrix_items ${column}`);
        console.log(`✅ Matrix items: ${column}`);
      } catch (error) {
        if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
          console.log(`⚠️  Matrix items: ${column} (already exists)`);
        } else {
          console.log(`❌ Matrix items: ${column} - ${error.message}`);
        }
      }
    }

    // Add missing columns to matrix_assignments
    const assignmentColumns = [
      'ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER completed_at',
      'ADD COLUMN items_with_evidence INT DEFAULT 0 AFTER progress_percentage',
      'ADD COLUMN total_items INT DEFAULT 0 AFTER items_with_evidence',
      'ADD COLUMN last_activity_at TIMESTAMP NULL AFTER total_items'
    ];

    for (const column of assignmentColumns) {
      try {
        await connection.execute(`ALTER TABLE matrix_assignments ${column}`);
        console.log(`✅ Matrix assignments: ${column}`);
      } catch (error) {
        if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
          console.log(`⚠️  Matrix assignments: ${column} (already exists)`);
        } else {
          console.log(`❌ Matrix assignments: ${column} - ${error.message}`);
        }
      }
    }

    // Create views
    console.log('\n🔄 Creating views...');
    
    // Drop existing views first
    try {
      await connection.execute('DROP VIEW IF EXISTS matrix_progress_view');
      await connection.execute('DROP VIEW IF EXISTS matrix_evidence_tracking');
    } catch (error) {
      console.log('⚠️  Views not found, continuing...');
    }

    // Create matrix_progress_view
    const progressViewSQL = `
      CREATE VIEW matrix_progress_view AS
      SELECT 
          ma.id as assignment_id,
          ma.assigned_to,
          ma.assigned_by,
          ma.status as assignment_status,
          ma.assigned_at,
          ma.completed_at,
          ma.progress_percentage,
          ma.items_with_evidence,
          ma.total_items,
          ma.last_activity_at,
          mr.id as matrix_report_id,
          mr.title as matrix_title,
          mr.description as matrix_description,
          mr.target_opd,
          mr.created_at as matrix_created_at,
          u.name as opd_user_name,
          u.email as opd_user_email,
          u.institution as opd_institution,
          inspector.name as inspector_name,
          COALESCE(
              (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status IN ('submitted', 'approved')), 
              0
          ) as completed_items,
          COALESCE(
              (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id), 
              0
          ) as total_matrix_items,
          COALESCE(
              (SELECT COUNT(*) FROM evidence_files ef 
               JOIN matrix_items mi ON ef.matrix_item_id = mi.id 
               WHERE mi.matrix_report_id = mr.id AND ef.status IN ('submitted', 'approved')), 
              0
          ) as evidence_files_count
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      JOIN users inspector ON ma.assigned_by = inspector.id
      ORDER BY ma.assigned_at DESC
    `;

    await connection.execute(progressViewSQL);
    console.log('✅ Created matrix_progress_view');

    // Create matrix_evidence_tracking view
    const trackingViewSQL = `
      CREATE VIEW matrix_evidence_tracking AS
      SELECT 
          mi.id as matrix_item_id,
          mi.matrix_report_id,
          mi.item_number,
          mi.temuan,
          mi.penyebab,
          mi.rekomendasi,
          mi.tindak_lanjut,
          mi.status as item_status,
          mi.submitted_at,
          mi.reviewed_at,
          mr.title as matrix_title,
          mr.target_opd,
          ma.assigned_to as opd_user_id,
          u.name as opd_user_name,
          u.institution as opd_institution,
          COALESCE(
              (SELECT COUNT(*) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
              0
          ) as evidence_count,
          COALESCE(
              (SELECT GROUP_CONCAT(ef.original_filename SEPARATOR ', ') 
               FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
              NULL
          ) as evidence_files,
          COALESCE(
              (SELECT MAX(ef.uploaded_at) FROM evidence_files ef WHERE ef.matrix_item_id = mi.id), 
              NULL
          ) as last_evidence_upload,
          COALESCE(
              (SELECT ef.status FROM evidence_files ef WHERE ef.matrix_item_id = mi.id ORDER BY ef.uploaded_at DESC LIMIT 1), 
              NULL
          ) as latest_evidence_status
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      ORDER BY mr.created_at DESC, mi.item_number ASC
    `;

    await connection.execute(trackingViewSQL);
    console.log('✅ Created matrix_evidence_tracking view');

    console.log('\n✅ Matrix tables fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing tables:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

fixMatrixTables();