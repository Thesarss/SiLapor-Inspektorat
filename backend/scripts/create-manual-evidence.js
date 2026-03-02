#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function createManualEvidence() {
  let connection;
  
  try {
    // Load environment variables
    const envPath = path.join(__dirname, '..', '.env');
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

    // Get some users for evidence creation
    const [users] = await connection.execute(`
      SELECT id, name, role, institution 
      FROM users 
      WHERE role = 'opd' 
      LIMIT 5
    `);

    console.log(`📋 Found ${users.length} OPD users`);

    // Create manual evidence files without matrix_item_id
    const evidenceData = [
      {
        filename: 'dokumen-tindak-lanjut-1.pdf',
        category: 'Dokumen',
        description: 'Dokumen tindak lanjut audit infrastruktur',
        priority: 'high',
        status: 'approved'
      },
      {
        filename: 'foto-pelaksanaan-kegiatan.jpg',
        category: 'Foto',
        description: 'Foto pelaksanaan kegiatan perbaikan sistem',
        priority: 'medium',
        status: 'pending'
      },
      {
        filename: 'surat-pernyataan-selesai.docx',
        category: 'Surat',
        description: 'Surat pernyataan penyelesaian tindak lanjut',
        priority: 'high',
        status: 'approved'
      },
      {
        filename: 'laporan-progress-mingguan.xlsx',
        category: 'Laporan',
        description: 'Laporan progress mingguan pelaksanaan audit',
        priority: 'medium',
        status: 'pending'
      },
      {
        filename: 'bukti-pembayaran-vendor.pdf',
        category: 'Bukti',
        description: 'Bukti pembayaran kepada vendor pelaksana',
        priority: 'low',
        status: 'approved'
      }
    ];

    for (let i = 0; i < evidenceData.length && i < users.length; i++) {
      const evidence = evidenceData[i];
      const user = users[i];
      const evidenceId = `evidence-manual-${Date.now()}-${i}`;
      
      try {
        await connection.execute(`
          INSERT INTO evidence_files (
            id, original_filename, stored_filename, file_path,
            file_size, file_type, mime_type, description, category, priority,
            status, uploaded_by, uploaded_at, searchable_content
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        `, [
          evidenceId,
          evidence.filename,
          `${evidenceId}.${evidence.filename.split('.').pop()}`,
          `/uploads/evidence/${evidenceId}.${evidence.filename.split('.').pop()}`,
          Math.floor(Math.random() * 3000000) + 500000,
          evidence.filename.split('.').pop(),
          `application/${evidence.filename.split('.').pop()}`,
          evidence.description,
          evidence.category,
          evidence.priority,
          evidence.status,
          user.id,
          `${evidence.description} dari ${user.institution} oleh ${user.name}`
        ]);
        
        console.log(`✅ Created evidence: ${evidence.filename} (${evidence.status}) by ${user.name}`);
      } catch (error) {
        console.log(`❌ Error creating evidence ${i + 1}:`, error.message);
      }
    }

    // Create some matrix items that need review
    const [matrixAssignments] = await connection.execute(`
      SELECT id, matrix_report_id, assigned_to 
      FROM matrix_assignments 
      LIMIT 3
    `);

    if (matrixAssignments.length > 0) {
      for (let i = 0; i < matrixAssignments.length; i++) {
        const assignment = matrixAssignments[i];
        const itemId = `matrix-item-${Date.now()}-${i}`;
        
        try {
          await connection.execute(`
            INSERT INTO matrix_items (
              id, matrix_report_id, temuan, penyebab, rekomendasi, 
              status, submitted_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            itemId,
            assignment.matrix_report_id,
            `Temuan audit ${i + 1}: Sistem belum optimal`,
            `Penyebab: Kurangnya monitoring dan evaluasi berkala`,
            `Rekomendasi: Implementasi sistem monitoring terintegrasi`,
            'submitted'
          ]);
          
          console.log(`✅ Created matrix item ${i + 1} for review`);
        } catch (error) {
          console.log(`❌ Error creating matrix item ${i + 1}:`, error.message);
        }
      }
    }

    // Check final results
    const [evidenceCount] = await connection.execute('SELECT COUNT(*) as count FROM evidence_files');
    console.log(`📋 Total evidence files: ${evidenceCount[0].count}`);

    const [matrixItemsCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM matrix_items WHERE status = 'submitted'
    `);
    console.log(`📋 Matrix items needing review: ${matrixItemsCount[0].count}`);

    // Show sample evidence
    const [sampleEvidence] = await connection.execute(`
      SELECT ef.original_filename, ef.category, ef.status, u.name as uploaded_by
      FROM evidence_files ef
      JOIN users u ON ef.uploaded_by = u.id
      LIMIT 5
    `);
    
    console.log('📋 Sample evidence files:');
    sampleEvidence.forEach(row => {
      console.log(`   - ${row.original_filename} (${row.category}, ${row.status}) by ${row.uploaded_by}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

createManualEvidence();