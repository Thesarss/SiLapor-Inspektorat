const mysql = require('mysql2/promise');

async function testDuplicateReviews() {
  console.log('🔍 TESTING DUPLICATE REVIEWS FIX\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evaluation_reporting'
  });

  try {
    // 1. Check matrix items with submitted status
    console.log('1️⃣ Checking submitted matrix items...\n');
    const [submittedItems] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        LEFT(mi.temuan, 50) as temuan_short,
        mi.status,
        mr.title as matrix_title
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      WHERE mi.status = 'submitted'
    `);

    console.log(`Found ${submittedItems.length} submitted items:\n`);
    submittedItems.forEach(item => {
      console.log(`   - Item #${item.item_number}: ${item.temuan_short}...`);
      console.log(`     Matrix: ${item.matrix_title}`);
    });
    console.log('');

    // 2. Check how many assignments per matrix
    console.log('2️⃣ Checking assignments per matrix...\n');
    const [assignments] = await connection.execute(`
      SELECT 
        mr.id,
        mr.title,
        COUNT(ma.id) as assignment_count,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assigned_users
      FROM matrix_reports mr
      LEFT JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      LEFT JOIN users u ON ma.assigned_to = u.id
      GROUP BY mr.id, mr.title
      HAVING assignment_count > 0
    `);

    console.log('Matrix assignments:\n');
    assignments.forEach(matrix => {
      console.log(`   📋 ${matrix.title}`);
      console.log(`      Assignments: ${matrix.assignment_count}`);
      console.log(`      Users: ${matrix.assigned_users}`);
      console.log('');
    });

    // 3. Test OLD query (with JOIN to assignments) - would cause duplicates
    console.log('3️⃣ Testing OLD query (with JOIN)...\n');
    const [oldQuery] = await connection.execute(`
      SELECT 
        mi.id,
        mi.item_number,
        mr.title as matrix_title,
        u.name as user_name,
        ma.id as assignment_id
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON mr.id = ma.matrix_report_id
      JOIN users u ON ma.assigned_to = u.id
      WHERE mi.status = 'submitted'
    `);

    console.log(`OLD query returned ${oldQuery.length} rows`);
    if (oldQuery.length > submittedItems.length) {
      console.log(`⚠️  DUPLICATE! ${oldQuery.length - submittedItems.length} extra rows due to multiple assignments\n`);
    } else {
      console.log('✅ No duplicates\n');
    }

    // 4. Test NEW query (with DISTINCT, no JOIN to assignments)
    console.log('4️⃣ Testing NEW query (with DISTINCT)...\n');
    const [newQuery] = await connection.execute(`
      SELECT DISTINCT
        mi.id,
        mi.item_number,
        mr.title as matrix_title,
        mr.target_opd as user_institution
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      WHERE mi.status = 'submitted'
    `);

    console.log(`NEW query returned ${newQuery.length} rows`);
    if (newQuery.length === submittedItems.length) {
      console.log('✅ No duplicates! Each item appears only once\n');
    } else {
      console.log(`⚠️  Still has issues\n`);
    }

    // 5. Summary
    console.log('📊 SUMMARY:\n');
    console.log(`   Actual submitted items: ${submittedItems.length}`);
    console.log(`   OLD query results: ${oldQuery.length} (${oldQuery.length > submittedItems.length ? '❌ Has duplicates' : '✅ OK'})`);
    console.log(`   NEW query results: ${newQuery.length} (${newQuery.length === submittedItems.length ? '✅ Fixed' : '❌ Still has issues'})`);
    console.log('');

    if (newQuery.length === submittedItems.length) {
      console.log('✅ FIX VERIFIED: Duplicate issue resolved!');
    } else {
      console.log('❌ FIX INCOMPLETE: Still need more work');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testDuplicateReviews();
