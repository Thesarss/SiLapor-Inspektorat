#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function fixEvidenceSafe() {
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

    // Check current structure
    const [columns] = await connection.execute('DESCRIBE evidence_files');
    console.log('📋 Current evidence_files structure:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    // Add missing columns if they don't exist
    const columnNames = columns.map(col => col.Field);
    
    const requiredColumns = [
      { name: 'matrix_item_id', type: 'VARCHAR(36)' },
      { name: 'uploaded_by', type: 'VARCHAR(36) NOT NULL' },
      { name: 'reviewed_by', type: 'VARCHAR(36)' },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'priority', type: 'ENUM("low", "medium", "high") DEFAULT "medium"' },
      { name: 'status', type: 'ENUM("pending", "approved", "rejected") DEFAULT "pending"' },
      { name: 'description', type: 'TEXT' },
      { name: 'file_type', type: 'VARCHAR(50)' },
      { name: 'mime_type', type: 'VARCHAR(100)' },
      { name: 'reviewed_at', type: 'TIMESTAMP NULL' },
      { name: 'searchable_content', type: 'TEXT' },
      { name: 'metadata', type: 'JSON' }
    ];

    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        try {
          await connection.execute(`ALTER TABLE evidence_files ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added column: ${col.name}`);
        } catch (error) {
          console.log(`❌ Error adding column ${col.name}:`, error.message);
        }
      } else {
        console.log(`⚠️  Column ${col.name} already exists`);
      }
    }

    // Rename columns if needed
    if (columnNames.includes('original_name') && !columnNames.includes('original_filename')) {
      try {
        await connection.execute('ALTER TABLE evidence_files CHANGE original_name original_filename VARCHAR(255) NOT NULL');
        console.log('✅ Renamed original_name to original_filename');
      } catch (error) {
        console.log('❌ Error renaming column:', error.message);
      }
    }

    if (columnNames.includes('stored_name') && !columnNames.includes('stored_filename')) {
      try {
        await connection.execute('ALTER TABLE evidence_files CHANGE stored_name stored_filename VARCHAR(255) NOT NULL');
        console.log('✅ Renamed stored_name to stored_filename');
      } catch (error) {
        console.log('❌ Error renaming column:', error.message);
      }
    }

    // Add indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_matrix_item ON evidence_files(matrix_item_id)',
      'CREATE INDEX IF NOT EXISTS idx_uploaded_by ON evidence_files(uploaded_by)',
      'CREATE INDEX IF NOT EXISTS idx_status ON evidence_files(status)',
      'CREATE INDEX IF NOT EXISTS idx_category ON evidence_files(category)',
      'CREATE INDEX IF NOT EXISTS idx_uploaded_at ON evidence_files(uploaded_at)'
    ];

    for (const indexSQL of indexes) {
      try {
        await connection.execute(indexSQL);
        console.log('✅ Created index');
      } catch (error) {
        if (error.message.includes('Duplicate key name')) {
          console.log('⚠️  Index already exists');
        } else {
          console.log('❌ Error creating index:', error.message);
        }
      }
    }

    // Create sample evidence data
    try {
      // First, get some matrix items and users
      const [matrixItems] = await connection.execute(`
        SELECT mi.id as matrix_item_id, ma.assigned_to as user_id
        FROM matrix_items mi
        JOIN matrix_assignments ma ON mi.matrix_report_id = ma.matrix_report_id
        WHERE mi.status = 'completed'
        LIMIT 3
      `);

      if (matrixItems.length > 0) {
        for (let i = 0; i < matrixItems.length; i++) {
          const item = matrixItems[i];
          const evidenceId = `evidence-${Date.now()}-${i}`;
          
          await connection.execute(`
            INSERT IGNORE INTO evidence_files (
              id, matrix_item_id, original_filename, stored_filename, file_path,
              file_size, file_type, mime_type, description, category, priority,
              status, uploaded_by, uploaded_at, searchable_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
          `, [
            evidenceId,
            item.matrix_item_id,
            `evidence-${i + 1}.pdf`,
            `${evidenceId}.pdf`,
            `/uploads/evidence/${evidenceId}.pdf`,
            1024000 + (i * 100000),
            'pdf',
            'application/pdf',
            `Evidence dokumen untuk matrix item ${i + 1}`,
            'Dokumen',
            'medium',
            'approved',
            item.user_id,
            `Evidence dokumen matrix item ${i + 1} tindak lanjut audit`
          ]);
          
          console.log(`✅ Created sample evidence ${i + 1}`);
        }
      }
    } catch (error) {
      console.log('❌ Error creating sample data:', error.message);
    }

    // Check final results
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM evidence_files');
    console.log(`📋 Final evidence files count: ${finalCount[0].count}`);

    if (finalCount[0].count > 0) {
      const [sampleData] = await connection.execute(`
        SELECT original_filename, category, status, uploaded_at 
        FROM evidence_files 
        LIMIT 3
      `);
      console.log('📋 Sample evidence files:');
      sampleData.forEach(row => {
        console.log(`   - ${row.original_filename} (${row.category}, ${row.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

fixEvidenceSafe();