#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function fixViews() {
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
    console.log('🔄 Fixing views...\n');

    // Drop existing views first
    try {
      await connection.execute('DROP VIEW IF EXISTS matrix_evidence_tracking');
      console.log('✅ Dropped existing matrix_evidence_tracking view');
    } catch (error) {
      console.log('⚠️  View not found, continuing...');
    }

    // Create matrix_evidence_tracking view (fixed)
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
          mi.updated_at as submitted_at,
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
    console.log('✅ Created matrix_evidence_tracking view (fixed)');

    console.log('\n✅ Views fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing views:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

fixViews();