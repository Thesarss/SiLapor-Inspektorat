#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function createTestData() {
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
    console.log('🔄 Creating test matrix data...\n');

    // Get users
    const [inspektoratUsers] = await connection.execute(
      'SELECT id, name FROM users WHERE role = ? LIMIT 1',
      ['inspektorat']
    );
    
    const [opdUsers] = await connection.execute(
      'SELECT id, name, institution FROM users WHERE role = ? LIMIT 2',
      ['opd']
    );

    if (inspektoratUsers.length === 0) {
      console.log('❌ No inspektorat user found');
      return;
    }

    if (opdUsers.length === 0) {
      console.log('❌ No OPD users found');
      return;
    }

    const inspektorat = inspektoratUsers[0];
    const opd1 = opdUsers[0];
    const opd2 = opdUsers[1] || opdUsers[0];

    console.log(`👤 Inspektorat: ${inspektorat.name}`);
    console.log(`🏢 OPD 1: ${opd1.name} (${opd1.institution})`);
    console.log(`🏢 OPD 2: ${opd2.name} (${opd2.institution})\n`);

    // Create matrix reports
    const matrixReports = [
      {
        id: uuidv4(),
        title: 'Matrix Audit Keuangan Q1 2024',
        description: 'Audit keuangan triwulan pertama tahun 2024',
        target_opd: opd1.institution,
        items: [
          {
            temuan: 'Keterlambatan penyusunan laporan keuangan bulanan',
            penyebab: 'Kurangnya koordinasi antar divisi dan sistem pencatatan yang belum terintegrasi',
            rekomendasi: 'Implementasi sistem informasi keuangan terintegrasi dan penjadwalan rutin koordinasi'
          },
          {
            temuan: 'Selisih saldo kas kecil dengan catatan pembukuan',
            penyebab: 'Pencatatan transaksi kas kecil tidak dilakukan secara real-time',
            rekomendasi: 'Penerapan sistem pencatatan kas kecil digital dan rekonsiliasi harian'
          },
          {
            temuan: 'Dokumen pendukung transaksi tidak lengkap',
            penyebab: 'Belum ada SOP yang jelas untuk kelengkapan dokumen transaksi',
            rekomendasi: 'Penyusunan SOP kelengkapan dokumen dan pelatihan staff'
          }
        ]
      },
      {
        id: uuidv4(),
        title: 'Matrix Audit Kepegawaian 2024',
        description: 'Audit sistem kepegawaian dan absensi',
        target_opd: opd2.institution,
        items: [
          {
            temuan: 'Data absensi pegawai tidak akurat',
            penyebab: 'Sistem absensi manual dan tidak terintegrasi dengan sistem kepegawaian',
            rekomendasi: 'Implementasi sistem absensi digital terintegrasi'
          },
          {
            temuan: 'Keterlambatan proses kenaikan pangkat',
            penyebab: 'Proses verifikasi dokumen masih manual dan memakan waktu lama',
            rekomendasi: 'Digitalisasi proses verifikasi dan approval kenaikan pangkat'
          }
        ]
      }
    ];

    // Insert matrix reports and items
    for (const report of matrixReports) {
      // Insert matrix report
      await connection.execute(`
        INSERT INTO matrix_reports (
          id, title, description, uploaded_by, target_opd, 
          original_filename, file_path, status, total_items, completed_items
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        report.id,
        report.title,
        report.description,
        inspektorat.id,
        report.target_opd,
        `${report.title.replace(/\s+/g, '_')}.xlsx`,
        `/uploads/matrix/${report.id}.xlsx`,
        'active',
        report.items.length,
        0
      ]);

      console.log(`✅ Created matrix report: ${report.title}`);

      // Insert matrix items
      for (let i = 0; i < report.items.length; i++) {
        const item = report.items[i];
        const itemId = uuidv4();
        
        await connection.execute(`
          INSERT INTO matrix_items (
            id, matrix_report_id, item_number, temuan, penyebab, rekomendasi, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          report.id,
          i + 1,
          item.temuan,
          item.penyebab,
          item.rekomendasi,
          'pending'
        ]);
      }

      // Create assignment for target OPD
      const targetOPD = report.target_opd === opd1.institution ? opd1 : opd2;
      const assignmentId = uuidv4();
      
      await connection.execute(`
        INSERT INTO matrix_assignments (
          id, matrix_report_id, assigned_to, assigned_by, status, total_items
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        assignmentId,
        report.id,
        targetOPD.id,
        inspektorat.id,
        'pending',
        report.items.length
      ]);

      console.log(`✅ Created assignment for ${targetOPD.name} (${targetOPD.institution})`);
    }

    console.log('\n✅ Test matrix data created successfully!');
    console.log('📋 Summary:');
    console.log(`   - ${matrixReports.length} matrix reports created`);
    console.log(`   - ${matrixReports.reduce((sum, r) => sum + r.items.length, 0)} matrix items created`);
    console.log(`   - ${matrixReports.length} assignments created`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Login as OPD user to see matrix assignments');
    console.log('   2. Upload evidence for matrix items');
    console.log('   3. Login as Inspektorat to monitor progress');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

createTestData();