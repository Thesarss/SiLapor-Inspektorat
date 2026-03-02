#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function createTestReviews() {
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
    console.log('🔧 Creating test review items...\n');

    // Get a user for testing
    const [users] = await connection.execute(`
      SELECT id, name FROM users WHERE role = 'opd' LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('❌ No OPD users found');
      return;
    }
    
    const testUser = users[0];
    console.log(`👤 Using test user: ${testUser.name}`);

    // Create a test report if none exists
    let reportId;
    const [existingReports] = await connection.execute(`
      SELECT id FROM reports WHERE status = 'pending' LIMIT 1
    `);
    
    if (existingReports.length > 0) {
      reportId = existingReports[0].id;
      console.log(`📋 Using existing report: ${reportId}`);
    } else {
      reportId = uuidv4();
      await connection.execute(`
        INSERT INTO reports (id, title, description, created_by, status)
        VALUES (?, ?, ?, ?, ?)
      `, [
        reportId,
        'Test Report for Reviews',
        'This is a test report created for testing the review system',
        testUser.id,
        'pending'
      ]);
      console.log(`📋 Created new test report: ${reportId}`);
    }

    // Create a test follow-up with pending_approval status
    const followUpId = uuidv4();
    try {
      await connection.execute(`
        INSERT INTO follow_ups (id, report_id, user_id, content, status)
        VALUES (?, ?, ?, ?, ?)
      `, [
        followUpId,
        reportId,
        testUser.id,
        'Test follow-up content that needs to be reviewed by inspektorat',
        'pending_approval'
      ]);
      console.log(`✅ Created test follow-up: ${followUpId}`);
    } catch (error) {
      console.log('⚠️  Follow-up might already exist:', error.message);
    }

    // Create a test followup item and recommendation
    const followupItemId = uuidv4();
    try {
      await connection.execute(`
        INSERT INTO followup_items (id, report_id, import_detail_id, temuan, rekomendasi, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        followupItemId,
        reportId,
        'test-import-detail',
        'Test temuan yang perlu ditindaklanjuti',
        'Test rekomendasi untuk perbaikan',
        'pending'
      ]);
      console.log(`✅ Created test followup item: ${followupItemId}`);

      // Create a recommendation for this item
      const recommendationId = uuidv4();
      await connection.execute(`
        INSERT INTO followup_item_recommendations (id, followup_item_id, recommendation_text, status)
        VALUES (?, ?, ?, ?)
      `, [
        recommendationId,
        followupItemId,
        'Test recommendation text that needs admin review',
        'submitted'
      ]);
      console.log(`✅ Created test recommendation: ${recommendationId}`);
    } catch (error) {
      console.log('⚠️  Followup item/recommendation might already exist:', error.message);
    }

    // Create test evidence files
    const evidenceId1 = uuidv4();
    const evidenceId2 = uuidv4();
    
    try {
      await connection.execute(`
        INSERT INTO evidence_files (id, original_filename, stored_filename, file_path, file_size, file_type, mime_type, description, category, status, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        evidenceId1,
        'test-evidence-1.pdf',
        'test-evidence-1.pdf',
        '/uploads/evidence/test-evidence-1.pdf',
        1024000,
        'pdf',
        'application/pdf',
        'Test evidence file 1 for review',
        'Dokumen',
        'pending',
        testUser.id
      ]);
      console.log(`✅ Created test evidence 1: ${evidenceId1}`);

      await connection.execute(`
        INSERT INTO evidence_files (id, original_filename, stored_filename, file_path, file_size, file_type, mime_type, description, category, status, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        evidenceId2,
        'test-evidence-2.jpg',
        'test-evidence-2.jpg',
        '/uploads/evidence/test-evidence-2.jpg',
        512000,
        'jpg',
        'image/jpeg',
        'Test evidence file 2 for review',
        'Foto',
        'pending',
        testUser.id
      ]);
      console.log(`✅ Created test evidence 2: ${evidenceId2}`);
    } catch (error) {
      console.log('⚠️  Evidence files might already exist:', error.message);
    }

    // Verify the test data
    console.log('\n🔍 Verifying test data...');
    
    const [followUpCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM follow_ups WHERE status = 'pending_approval'
    `);
    console.log(`📋 Pending follow-ups: ${followUpCount[0].count}`);
    
    const [recommendationCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM followup_item_recommendations WHERE status = 'submitted'
    `);
    console.log(`📋 Pending recommendations: ${recommendationCount[0].count}`);
    
    const [evidenceCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM evidence_files WHERE status = 'pending'
    `);
    console.log(`📋 Pending evidence: ${evidenceCount[0].count}`);
    
    const totalPending = followUpCount[0].count + recommendationCount[0].count + evidenceCount[0].count;
    console.log(`📊 Total pending reviews: ${totalPending}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

createTestReviews();