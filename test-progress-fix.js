const mysql = require('mysql2/promise');

async function testProgressFix() {
  try {
    console.log('🧪 Testing Progress Calculation Fix...');
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'inspektorat_db'
    });
    
    // Check current matrix assignments progress
    const [assignments] = await connection.execute(`
      SELECT 
        ma.id,
        ma.progress_percentage,
        ma.total_items,
        ma.items_with_evidence,
        u.name as user_name,
        mr.title as matrix_title
      FROM matrix_assignments ma
      JOIN users u ON ma.assigned_to = u.id
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      ORDER BY ma.progress_percentage DESC
    `);
    
    console.log('📊 Current Matrix Assignment Progress:');
    console.log('=====================================');
    
    if (assignments.length === 0) {
      console.log('ℹ️  No matrix assignments found in database');
    } else {
      assignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.user_name} - ${assignment.matrix_title}`);
        console.log(`   Progress: ${assignment.progress_percentage}% (${assignment.items_with_evidence}/${assignment.total_items} items)`);
        console.log('');
      });
    }
    
    // Check if any progress is over 100% (which would indicate the bug is still present)
    const overHundred = assignments.filter(a => a.progress_percentage > 100);
    if (overHundred.length > 0) {
      console.log('❌ BUG STILL PRESENT: Found assignments with progress > 100%:');
      overHundred.forEach(a => {
        console.log(`   - ${a.user_name}: ${a.progress_percentage}%`);
      });
    } else {
      console.log('✅ Progress calculation fix appears to be working correctly!');
      console.log('   All progress values are within 0-100% range.');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProgressFix();