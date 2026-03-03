const mysql = require('mysql2/promise');

async function fixMatrixProgressSync() {
  console.log('🔧 FIXING MATRIX PROGRESS SYNC\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evaluation_reporting'
  });

  try {
    // Get all matrix reports
    const [reports] = await connection.execute(`
      SELECT id, title FROM matrix_reports
    `);

    console.log(`Found ${reports.length} matrix reports to fix\n`);

    for (const report of reports) {
      // Count actual items
      const [counts] = await connection.execute(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as completed_items
        FROM matrix_items
        WHERE matrix_report_id = ?
      `, [report.id]);

      const { total_items, completed_items } = counts[0];

      // Update matrix_reports
      await connection.execute(`
        UPDATE matrix_reports
        SET total_items = ?, completed_items = ?
        WHERE id = ?
      `, [total_items, completed_items || 0, report.id]);

      console.log(`✅ ${report.title}`);
      console.log(`   Updated: ${completed_items || 0}/${total_items} completed\n`);
    }

    console.log('✅ All matrix reports progress synced!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixMatrixProgressSync();
