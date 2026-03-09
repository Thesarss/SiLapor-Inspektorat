const mysql = require('mysql2/promise');
require('dotenv').config();

async function comprehensiveAudit() {
  console.log('========================================');
  console.log('COMPREHENSIVE DATA AUDIT');
  console.log('========================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('✓ Connected to database\n');

    // 1. Check matrix_items duplicates
    console.log('1. MATRIX ITEMS - Checking for duplicates...');
    const [itemDuplicates] = await connection.query(`
      SELECT 
        matrix_report_id,
        item_number,
        COUNT(*) as count
      FROM matrix_items
      GROUP BY matrix_report_id, item_number
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (itemDuplicates.length > 0) {
      console.log(`   ⚠ FOUND ${itemDuplicates.length} DUPLICATE MATRIX ITEMS:`);
      itemDuplicates.forEach(dup => {
        console.log(`   - Report: ${dup.matrix_report_id}, Item #${dup.item_number}, Count: ${dup.count}`);
      });
      console.log('');
    } else {
      console.log('   ✓ No duplicates in matrix_items\n');
    }

    // 2. Check matrix_assignments duplicates
    console.log('2. MATRIX ASSIGNMENTS - Checking for duplicates...');
    const [assignmentDuplicates] = await connection.query(`
      SELECT 
        matrix_report_id,
        assigned_to,
        COUNT(*) as count
      FROM matrix_assignments
      GROUP BY matrix_report_id, assigned_to
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (assignmentDuplicates.length > 0) {
      console.log(`   ⚠ FOUND ${assignmentDuplicates.length} DUPLICATE ASSIGNMENTS:`);
      assignmentDuplicates.forEach(dup => {
        console.log(`   - Report: ${dup.matrix_report_id}, User: ${dup.assigned_to}, Count: ${dup.count}`);
      });
      console.log('');
    } else {
      console.log('   ✓ No duplicates in matrix_assignments\n');
    }

    // 3. Check evidence_files duplicates
    console.log('3. EVIDENCE FILES - Checking for duplicates...');
    const [evidenceDuplicates] = await connection.query(`
      SELECT 
        matrix_item_id,
        original_filename,
        COUNT(*) as count
      FROM evidence_files
      GROUP BY matrix_item_id, original_filename
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (evidenceDuplicates.length > 0) {
      console.log(`   ⚠ FOUND ${evidenceDuplicates.length} DUPLICATE EVIDENCE FILES:`);
      evidenceDuplicates.forEach(dup => {
        console.log(`   - Item: ${dup.matrix_item_id}, File: ${dup.original_filename}, Count: ${dup.count}`);
      });
      console.log('');
    } else {
      console.log('   ✓ No duplicates in evidence_files\n');
    }

    // 4. Check matrix_reports
    console.log('4. MATRIX REPORTS - Statistics...');
    const [reportStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(DISTINCT id) as unique_ids,
        COUNT(DISTINCT title) as unique_titles
      FROM matrix_reports
    `);
    console.log(`   Total reports: ${reportStats[0].total_reports}`);
    console.log(`   Unique IDs: ${reportStats[0].unique_ids}`);
    console.log(`   Unique titles: ${reportStats[0].unique_titles}\n`);

    // 5. Detailed matrix items per report
    console.log('5. MATRIX ITEMS PER REPORT...');
    const [itemsPerReport] = await connection.query(`
      SELECT 
        mr.id,
        mr.title,
        mr.target_opd,
        COUNT(mi.id) as item_count,
        COUNT(DISTINCT mi.item_number) as unique_item_numbers
      FROM matrix_reports mr
      LEFT JOIN matrix_items mi ON mr.id = mi.matrix_report_id
      GROUP BY mr.id, mr.title, mr.target_opd
      ORDER BY item_count DESC
    `);

    itemsPerReport.forEach(report => {
      const hasDuplicates = report.item_count !== report.unique_item_numbers;
      const status = hasDuplicates ? '⚠ HAS DUPLICATES' : '✓';
      console.log(`   ${status} ${report.title} (${report.target_opd})`);
      console.log(`      Total items: ${report.item_count}, Unique numbers: ${report.unique_item_numbers}`);
      if (hasDuplicates) {
        console.log(`      ⚠ DUPLICATE COUNT: ${report.item_count - report.unique_item_numbers}`);
      }
    });
    console.log('');

    // 6. Check assignments per report
    console.log('6. ASSIGNMENTS PER REPORT...');
    const [assignmentsPerReport] = await connection.query(`
      SELECT 
        mr.id,
        mr.title,
        mr.target_opd,
        COUNT(ma.id) as assignment_count,
        COUNT(DISTINCT ma.assigned_to) as unique_users
      FROM matrix_reports mr
      LEFT JOIN matrix_assignments ma ON mr.id = ma.matrix_report_id
      GROUP BY mr.id, mr.title, mr.target_opd
      ORDER BY assignment_count DESC
    `);

    assignmentsPerReport.forEach(report => {
      const hasDuplicates = report.assignment_count !== report.unique_users;
      const status = hasDuplicates ? '⚠ HAS DUPLICATES' : '✓';
      console.log(`   ${status} ${report.title} (${report.target_opd})`);
      console.log(`      Total assignments: ${report.assignment_count}, Unique users: ${report.unique_users}`);
      if (hasDuplicates) {
        console.log(`      ⚠ DUPLICATE COUNT: ${report.assignment_count - report.unique_users}`);
      }
    });
    console.log('');

    // 7. Find specific duplicate items
    if (itemDuplicates.length > 0) {
      console.log('7. DETAILED DUPLICATE ITEMS...');
      for (const dup of itemDuplicates.slice(0, 3)) { // Show first 3
        const [details] = await connection.query(`
          SELECT 
            id,
            matrix_report_id,
            item_number,
            LEFT(temuan, 50) as temuan_preview,
            status,
            created_at
          FROM matrix_items
          WHERE matrix_report_id = ? AND item_number = ?
          ORDER BY created_at
        `, [dup.matrix_report_id, dup.item_number]);

        console.log(`\n   Report: ${dup.matrix_report_id}, Item #${dup.item_number}:`);
        details.forEach((item, index) => {
          console.log(`   ${index + 1}. ID: ${item.id}`);
          console.log(`      Temuan: ${item.temuan_preview}...`);
          console.log(`      Status: ${item.status}`);
          console.log(`      Created: ${item.created_at}`);
        });
      }
      console.log('');
    }

    // 8. Summary
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Matrix Items Duplicates: ${itemDuplicates.length > 0 ? '⚠ YES' : '✓ NO'}`);
    console.log(`Matrix Assignments Duplicates: ${assignmentDuplicates.length > 0 ? '⚠ YES' : '✓ NO'}`);
    console.log(`Evidence Files Duplicates: ${evidenceDuplicates.length > 0 ? '⚠ YES' : '✓ NO'}`);
    console.log('');

    if (itemDuplicates.length > 0 || assignmentDuplicates.length > 0 || evidenceDuplicates.length > 0) {
      console.log('⚠ ACTION REQUIRED: Database has duplicates that need to be cleaned');
      console.log('');
      console.log('RECOMMENDED ACTIONS:');
      console.log('1. Backup database first');
      console.log('2. Run cleanup script to remove duplicates');
      console.log('3. Add unique constraints to prevent future duplicates');
    } else {
      console.log('✓ Database is clean - no duplicates found');
    }
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

comprehensiveAudit();
