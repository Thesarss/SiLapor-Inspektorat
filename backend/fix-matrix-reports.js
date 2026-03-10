const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMatrixReports() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔧 Fixing matrix_reports completed_items...');
    
    await connection.query(`
      UPDATE matrix_reports 
      SET completed_items = (
        SELECT COUNT(*) 
        FROM matrix_items mi 
        WHERE mi.matrix_report_id = matrix_reports.id AND mi.status = 'approved'
      )
    `);
    
    const [reports] = await connection.query(`
      SELECT title, completed_items,
        (SELECT COUNT(*) FROM matrix_items mi WHERE mi.matrix_report_id = mr.id AND mi.status = 'approved') as actual_completed
      FROM matrix_reports mr
    `);

    console.log('📊 Updated Matrix Reports:');
    reports.forEach(report => {
      console.log(`   ✅ ${report.title}: ${report.completed_items} completed`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixMatrixReports();