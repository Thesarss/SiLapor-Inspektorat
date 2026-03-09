const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCurrentProgress() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('========================================');
    console.log('CHECKING CURRENT PROGRESS VALUES');
    console.log('========================================\n');

    const [assignments] = await connection.query(`
      SELECT 
        ma.id,
        ma.total_items,
        ma.items_with_evidence,
        ma.progress_percentage,
        ma.status,
        u.name as user_name,
        u.institution,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY ma.progress_percentage DESC, mr.title, u.name
    `);

    console.log(`Found ${assignments.length} assignments\n`);

    let hasIssues = false;

    assignments.forEach((assignment, index) => {
      const hasProgress = assignment.progress_percentage > 0;
      const isOver100 = assignment.progress_percentage > 100;
      const isNegative = assignment.progress_percentage < 0;
      
      if (isOver100 || isNegative || (hasProgress && assignment.items_with_evidence === 0)) {
        hasIssues = true;
        console.log(`⚠️ ISSUE #${index + 1}:`);
      } else if (hasProgress) {
        console.log(`✓ #${index + 1}:`);
      } else {
        console.log(`  #${index + 1}:`);
      }

      console.log(`   ${assignment.matrix_title} - ${assignment.user_name}`);
      console.log(`   Institution: ${assignment.institution}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Total items: ${assignment.total_items}`);
      console.log(`   Items with evidence: ${assignment.items_with_evidence}`);
      console.log(`   Progress: ${assignment.progress_percentage}%`);

      if (isOver100) {
        console.log(`   ❌ OVER 100%! This should never happen!`);
      }
      if (isNegative) {
        console.log(`   ❌ NEGATIVE! This should never happen!`);
      }
      if (hasProgress && assignment.items_with_evidence === 0) {
        console.log(`   ⚠️ Has progress but no evidence items!`);
      }

      console.log('');
    });

    if (!hasIssues) {
      console.log('✅ All progress values look correct!');
    } else {
      console.log('⚠️ Found issues with progress values!');
      console.log('Run fix-progress-calculation.js to fix these issues.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkCurrentProgress();
