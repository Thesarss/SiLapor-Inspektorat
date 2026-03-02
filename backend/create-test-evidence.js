#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function createTestEvidence() {
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
    console.log('🔄 Creating test evidence and updating matrix items...\n');

    // Get some matrix items
    const [matrixItems] = await connection.execute(`
      SELECT mi.*, ma.id as assignment_id, ma.assigned_to
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      LIMIT 3
    `);

    if (matrixItems.length === 0) {
      console.log('❌ No matrix items found. Run create-test-matrix-data.js first');
      return;
    }

    // Create some tindak lanjut and evidence for testing
    for (let i = 0; i < matrixItems.length; i++) {
      const item = matrixItems[i];
      
      // Update matrix item with tindak lanjut
      const tindakLanjut = [
        'Telah dilakukan perbaikan sistem pencatatan keuangan dengan implementasi software akuntansi terintegrasi. Bukti: Screenshot sistem baru dan laporan hasil testing.',
        'Sudah dibuat SOP baru untuk kelengkapan dokumen transaksi dan dilakukan pelatihan kepada seluruh staff. Bukti: Dokumen SOP dan sertifikat pelatihan.',
        'Implementasi sistem absensi digital telah selesai dan terintegrasi dengan database kepegawaian. Bukti: Screenshot sistem dan laporan akurasi data.'
      ][i];
      
      await connection.execute(`
        UPDATE matrix_items 
        SET tindak_lanjut = ?, status = 'submitted', evidence_submitted = TRUE, evidence_count = 1
        WHERE id = ?
      `, [tindakLanjut, item.id]);
      
      // Create evidence file record
      const evidenceId = uuidv4();
      const filename = `evidence_${item.item_number}_${Date.now()}.pdf`;
      
      await connection.execute(`
        INSERT INTO evidence_files (
          id, matrix_item_id, assignment_id, original_filename, stored_filename,
          file_path, file_size, file_type, mime_type, description, category,
          priority, status, uploaded_by, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        evidenceId,
        item.id,
        item.assignment_id,
        filename,
        filename,
        `/uploads/matrix-evidence/${filename}`,
        1024 * 50, // 50KB
        'pdf',
        'application/pdf',
        `Evidence untuk matrix item #${item.item_number}: ${item.temuan.substring(0, 100)}...`,
        'Tindak Lanjut',
        'medium',
        'submitted',
        item.assigned_to
      ]);
      
      console.log(`✅ Created evidence for matrix item #${item.item_number}`);
    }

    // Update assignment progress
    const [assignments] = await connection.execute('SELECT DISTINCT ma.id as assignment_id FROM matrix_assignments ma');
    
    for (const assignment of assignments) {
      // Calculate progress
      const [progressData] = await connection.execute(`
        SELECT 
          COUNT(mi.id) as total_items,
          COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) as items_with_evidence,
          ROUND((COUNT(CASE WHEN mi.evidence_submitted = TRUE THEN 1 END) / COUNT(mi.id)) * 100, 2) as progress_percentage
        FROM matrix_assignments ma
        JOIN matrix_items mi ON mi.matrix_report_id = ma.matrix_report_id
        WHERE ma.id = ?
      `, [assignment.assignment_id]);
      
      if (progressData.length > 0) {
        const progress = progressData[0];
        
        await connection.execute(`
          UPDATE matrix_assignments 
          SET 
            total_items = ?,
            items_with_evidence = ?,
            progress_percentage = ?,
            last_activity_at = NOW(),
            status = CASE 
              WHEN ? >= 100 THEN 'completed'
              WHEN ? > 0 THEN 'in_progress'
              ELSE status 
            END
          WHERE id = ?
        `, [
          progress.total_items,
          progress.items_with_evidence,
          progress.progress_percentage,
          progress.progress_percentage,
          progress.progress_percentage,
          assignment.assignment_id
        ]);
        
        console.log(`✅ Updated assignment progress: ${progress.progress_percentage}%`);
      }
    }

    console.log('\n✅ Test evidence created successfully!');
    console.log('📋 Summary:');
    console.log(`   - ${matrixItems.length} matrix items updated with tindak lanjut`);
    console.log(`   - ${matrixItems.length} evidence files created`);
    console.log(`   - Assignment progress updated`);
    console.log('\n🎯 Now you can:');
    console.log('   1. Login as Inspektorat');
    console.log('   2. Go to Matrix Progress');
    console.log('   3. Click "Review Items" to see submitted items');
    console.log('   4. Review and approve/reject items');

  } catch (error) {
    console.error('❌ Error creating test evidence:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

createTestEvidence();