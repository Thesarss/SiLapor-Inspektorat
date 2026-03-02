#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function debugReviews() {
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
    console.log('🔍 Debugging review system...\n');

    // Check pending follow-ups
    try {
      const [followUps] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM follow_ups 
        WHERE status = 'pending_approval'
      `);
      console.log(`📋 Pending follow-ups: ${followUps[0].count}`);
      
      if (followUps[0].count > 0) {
        const [sampleFollowUps] = await connection.execute(`
          SELECT f.id, f.content, f.status, r.title as report_title, u.name as user_name
          FROM follow_ups f
          JOIN reports r ON f.report_id = r.id
          JOIN users u ON f.user_id = u.id
          WHERE f.status = 'pending_approval'
          LIMIT 3
        `);
        console.log('📋 Sample pending follow-ups:');
        sampleFollowUps.forEach(fu => {
          console.log(`   - ${fu.report_title} by ${fu.user_name} (${fu.status})`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking follow_ups:', error.message);
    }

    // Check pending recommendations
    try {
      const [recommendations] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM followup_item_recommendations 
        WHERE status = 'submitted'
      `);
      console.log(`📋 Pending recommendations: ${recommendations[0].count}`);
      
      if (recommendations[0].count > 0) {
        const [sampleRecs] = await connection.execute(`
          SELECT fir.id, fir.recommendation_text, fir.status, r.title as report_title
          FROM followup_item_recommendations fir
          JOIN followup_items fi ON fir.followup_item_id = fi.id
          JOIN reports r ON fi.report_id = r.id
          WHERE fir.status = 'submitted'
          LIMIT 3
        `);
        console.log('📋 Sample pending recommendations:');
        sampleRecs.forEach(rec => {
          console.log(`   - ${rec.report_title}: ${rec.recommendation_text.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking followup_item_recommendations:', error.message);
    }

    // Check matrix items
    try {
      const [matrixItems] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM matrix_items 
        WHERE status = 'submitted'
      `);
      console.log(`📋 Matrix items submitted: ${matrixItems[0].count}`);
      
      if (matrixItems[0].count > 0) {
        const [sampleMatrix] = await connection.execute(`
          SELECT mi.id, mi.temuan, mi.status, mr.title as matrix_title
          FROM matrix_items mi
          JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
          WHERE mi.status = 'submitted'
          LIMIT 3
        `);
        console.log('📋 Sample submitted matrix items:');
        sampleMatrix.forEach(item => {
          console.log(`   - ${item.matrix_title}: ${item.temuan.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking matrix_items:', error.message);
    }

    // Check evidence files
    try {
      const [evidence] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM evidence_files 
        WHERE status = 'pending'
      `);
      console.log(`📋 Evidence files pending: ${evidence[0].count}`);
      
      if (evidence[0].count > 0) {
        const [sampleEvidence] = await connection.execute(`
          SELECT ef.id, ef.original_filename, ef.status, u.name as uploaded_by
          FROM evidence_files ef
          JOIN users u ON ef.uploaded_by = u.id
          WHERE ef.status = 'pending'
          LIMIT 3
        `);
        console.log('📋 Sample pending evidence:');
        sampleEvidence.forEach(ev => {
          console.log(`   - ${ev.original_filename} by ${ev.uploaded_by}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking evidence_files:', error.message);
    }

    // Test the getAllPendingReviews query directly
    console.log('\n🔍 Testing getAllPendingReviews query...');
    try {
      const allReviews = [];
      
      // Get pending follow-ups
      const followUpsResult = await connection.execute(`
        SELECT 
          f.*,
          r.title as report_title,
          r.description as report_description,
          r.created_at as report_created_at,
          u.name as user_name,
          u.email as user_email,
          u.institution as user_institution,
          'follow_up' as review_type
        FROM follow_ups f
        JOIN reports r ON f.report_id = r.id
        JOIN users u ON f.user_id = u.id
        WHERE f.status = 'pending_approval'
        ORDER BY f.created_at ASC
      `);
      
      allReviews.push(...followUpsResult[0]);

      // Get pending recommendations
      const recommendationsResult = await connection.execute(`
        SELECT 
          fir.*,
          fi.description as item_description,
          r.title as report_title,
          r.description as report_description,
          r.created_at as report_created_at,
          u.name as user_name,
          u.email as user_email,
          u.institution as user_institution,
          'recommendation' as review_type
        FROM followup_item_recommendations fir
        JOIN followup_items fi ON fir.followup_item_id = fi.id
        JOIN reports r ON fi.report_id = r.id
        JOIN users u ON r.created_by = u.id
        WHERE fir.status = 'submitted'
        ORDER BY fir.created_at ASC
      `);
      
      allReviews.push(...recommendationsResult[0]);

      // Get submitted matrix items
      try {
        const matrixItemsResult = await connection.execute(`
          SELECT 
            mi.*,
            mr.title as matrix_title,
            mr.description as matrix_description,
            mr.created_at as matrix_created_at,
            u.name as user_name,
            u.email as user_email,
            u.institution as user_institution,
            'matrix_item' as review_type
          FROM matrix_items mi
          JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
          JOIN matrix_assignments ma ON mr.id = ma.matrix_report_id
          JOIN users u ON ma.assigned_to = u.id
          WHERE mi.status = 'submitted'
          ORDER BY mi.created_at ASC
        `);
        
        allReviews.push(...matrixItemsResult[0]);
      } catch (error) {
        console.log('Matrix items table not available');
      }

      // Get pending evidence files
      try {
        const evidenceResult = await connection.execute(`
          SELECT 
            ef.*,
            u.name as user_name,
            u.email as user_email,
            u.institution as user_institution,
            'evidence' as review_type
          FROM evidence_files ef
          JOIN users u ON ef.uploaded_by = u.id
          WHERE ef.status = 'pending'
          ORDER BY ef.uploaded_at ASC
        `);
        
        allReviews.push(...evidenceResult[0]);
      } catch (error) {
        console.log('Evidence files table not available');
      }
      
      console.log(`📊 Total pending reviews found: ${allReviews.length}`);
      
      if (allReviews.length > 0) {
        console.log('📋 Review types breakdown:');
        const breakdown = {};
        allReviews.forEach(review => {
          breakdown[review.review_type] = (breakdown[review.review_type] || 0) + 1;
        });
        Object.entries(breakdown).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });
        
        console.log('\n📋 Sample reviews:');
        allReviews.slice(0, 5).forEach(review => {
          console.log(`   - ${review.review_type}: ${review.report_title || review.matrix_title || review.original_filename || 'Unknown'}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Error testing getAllPendingReviews:', error.message);
    }

    // Check reports that might need follow-ups
    console.log('\n🔍 Checking reports status...');
    try {
      const [reports] = await connection.execute(`
        SELECT r.id, r.title, r.status, r.created_at, u.name as created_by_name,
               f.id as followup_id, f.status as followup_status
        FROM reports r
        JOIN users u ON r.created_by = u.id
        LEFT JOIN follow_ups f ON r.id = f.report_id
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      
      console.log('📋 Recent reports:');
      reports.forEach(report => {
        console.log(`   - ${report.title} (${report.status}) by ${report.created_by_name}`);
        if (report.followup_id) {
          console.log(`     └─ Follow-up: ${report.followup_status}`);
        } else {
          console.log(`     └─ No follow-up yet`);
        }
      });
    } catch (error) {
      console.log('❌ Error checking reports:', error.message);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

debugReviews();