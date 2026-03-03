/**
 * Check review issue - direct database query
 */

const mysql = require('mysql2/promise');

async function checkReviewIssue() {
  console.log('🔍 Checking Review Issue...\n');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evaluation_reporting'
  });

  try {
    // Check users
    console.log('1️⃣  Checking Inspektorat users...');
    const [users] = await connection.query(`
      SELECT id, username, email, name, role 
      FROM users 
      WHERE role IN ('inspektorat', 'super_admin')
      LIMIT 5
    `);
    console.log('   Found users:', users.length);
    users.forEach(u => {
      console.log(`   - ${u.name} (${u.username}) - ${u.role}`);
    });

    // Check follow_ups pending
    console.log('\n2️⃣  Checking follow_ups table...');
    const [followUps] = await connection.query(`
      SELECT id, report_id, status, created_at
      FROM follow_ups
      WHERE status = 'pending_approval'
      LIMIT 5
    `);
    console.log(`   Pending follow-ups: ${followUps.length}`);

    // Check recommendations
    console.log('\n3️⃣  Checking recommendations...');
    const [recommendations] = await connection.query(`
      SELECT id, followup_item_id, status, created_at
      FROM followup_item_recommendations
      WHERE status = 'submitted'
      LIMIT 5
    `);
    console.log(`   Submitted recommendations: ${recommendations.length}`);

    // Check matrix items
    console.log('\n4️⃣  Checking matrix items...');
    const [matrixItems] = await connection.query(`
      SELECT id, matrix_report_id, status, created_at
      FROM matrix_items
      WHERE status = 'submitted'
      LIMIT 5
    `);
    console.log(`   Submitted matrix items: ${matrixItems.length}`);

    // Check evidence files
    console.log('\n5️⃣  Checking evidence files...');
    const [evidenceFiles] = await connection.query(`
      SELECT id, original_filename, status, uploaded_at
      FROM evidence_files
      WHERE status = 'pending'
      LIMIT 5
    `);
    console.log(`   Pending evidence: ${evidenceFiles.length}`);

    // Total pending
    const totalPending = followUps.length + recommendations.length + matrixItems.length + evidenceFiles.length;
    console.log(`\n📊 Total Pending Reviews: ${totalPending}`);

    if (totalPending === 0) {
      console.log('\n⚠️  No pending reviews found in database!');
      console.log('\n💡 Possible reasons:');
      console.log('   1. All items have been reviewed');
      console.log('   2. No items have been submitted yet');
      console.log('   3. Status values are different than expected');
      
      // Check all statuses
      console.log('\n6️⃣  Checking all matrix item statuses...');
      const [allStatuses] = await connection.query(`
        SELECT status, COUNT(*) as count
        FROM matrix_items
        GROUP BY status
      `);
      console.log('   Matrix item statuses:');
      allStatuses.forEach(s => {
        console.log(`   - ${s.status}: ${s.count}`);
      });
    } else {
      console.log('\n✅ Found pending items in database');
      console.log('   Issue might be in the API endpoint or frontend');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await connection.end();
  }
}

checkReviewIssue();
