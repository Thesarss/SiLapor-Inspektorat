const mysql = require('./backend/node_modules/mysql2/promise');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

async function fixRoutingAndStats() {
  console.log('🔧 Fix Routing and Statistics\n');

  let connection;

  try {
    // Connect
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'evaluation_reporting'
    });

    console.log('✅ Connected to database\n');

    // Check current matrix statistics
    console.log('📊 Current Matrix Statistics:\n');

    // 1. Matrix Reports
    const [reports] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM matrix_reports
    `);

    console.log('Matrix Reports:');
    console.log(`   Total: ${reports[0].total}`);
    console.log(`   Draft: ${reports[0].draft}`);
    console.log(`   Active: ${reports[0].active}`);
    console.log(`   Completed: ${reports[0].completed}\n`);

    // 2. Matrix Assignments
    const [assignments] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM matrix_assignments
    `);

    console.log('Matrix Assignments:');
    console.log(`   Total: ${assignments[0].total}`);
    console.log(`   Pending: ${assignments[0].pending}`);
    console.log(`   In Progress: ${assignments[0].in_progress}`);
    console.log(`   Completed: ${assignments[0].completed}\n`);

    // 3. Matrix Items Progress
    const [items] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM matrix_items
    `);

    console.log('Matrix Items:');
    console.log(`   Total: ${items[0].total}`);
    console.log(`   Pending: ${items[0].pending}`);
    console.log(`   In Progress: ${items[0].in_progress}`);
    console.log(`   Completed: ${items[0].completed}\n`);

    // 4. Latest Matrix Report Details
    const [latestReport] = await connection.execute(`
      SELECT 
        mr.id,
        mr.title,
        mr.target_opd,
        mr.status,
        mr.total_items,
        mr.completed_items,
        COUNT(ma.id) as assignment_count
      FROM matrix_reports mr
      LEFT JOIN matrix_assignments ma ON mr.id = ma.matrix_report_id
      GROUP BY mr.id
      ORDER BY mr.created_at DESC
      LIMIT 1
    `);

    if (latestReport.length > 0) {
      const report = latestReport[0];
      console.log('Latest Matrix Report:');
      console.log(`   Title: "${report.title}"`);
      console.log(`   Target: ${report.target_opd}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Total Items: ${report.total_items}`);
      console.log(`   Completed Items: ${report.completed_items}`);
      console.log(`   Progress: ${Math.round((report.completed_items / report.total_items) * 100)}%`);
      console.log(`   Assignments: ${report.assignment_count}\n`);
    }

    // 5. Check if statistics are being updated
    console.log('🔍 Checking Data Consistency:\n');

    const [reportItems] = await connection.execute(`
      SELECT 
        mr.id,
        mr.title,
        mr.total_items as report_total,
        mr.completed_items as report_completed,
        COUNT(mi.id) as actual_total,
        SUM(CASE WHEN mi.status = 'completed' THEN 1 ELSE 0 END) as actual_completed
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mr.id = mi.matrix_report_id
      GROUP BY mr.id
      ORDER BY mr.created_at DESC
      LIMIT 1
    `);

    if (reportItems.length > 0) {
      const item = reportItems[0];
      const totalMatch = item.report_total === item.actual_total;
      const completedMatch = item.report_completed === item.actual_completed;

      console.log('Data Consistency Check:');
      console.log(`   Report Total: ${item.report_total} | Actual: ${item.actual_total} ${totalMatch ? '✅' : '❌'}`);
      console.log(`   Report Completed: ${item.report_completed} | Actual: ${item.actual_completed} ${completedMatch ? '✅' : '❌'}\n`);

      if (!totalMatch || !completedMatch) {
        console.log('⚠️  Statistics mismatch detected! Fixing...\n');

        // Fix the statistics
        await connection.execute(`
          UPDATE matrix_reports mr
          SET 
            total_items = (SELECT COUNT(*) FROM matrix_items WHERE matrix_report_id = mr.id),
            completed_items = (SELECT COUNT(*) FROM matrix_items WHERE matrix_report_id = mr.id AND status = 'completed')
          WHERE mr.id = ?
        `, [item.id]);

        console.log('✅ Statistics updated!\n');

        // Verify fix
        const [fixed] = await connection.execute(`
          SELECT total_items, completed_items FROM matrix_reports WHERE id = ?
        `, [item.id]);

        console.log('Updated Statistics:');
        console.log(`   Total Items: ${fixed[0].total_items}`);
        console.log(`   Completed Items: ${fixed[0].completed_items}\n`);
      } else {
        console.log('✅ Statistics are consistent!\n');
      }
    }

    console.log('✅ Fix complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

fixRoutingAndStats();
