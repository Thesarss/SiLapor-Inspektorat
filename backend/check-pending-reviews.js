const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkPendingReviews() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lhp_system'
  });

  console.log('=== CHECKING PENDING REVIEWS ===\n');

  // 1. Follow-ups
  const [followUps] = await connection.query(`
    SELECT COUNT(*) as count FROM follow_ups WHERE status = 'pending_approval'
  `);
  console.log('1. Follow-ups (pending_approval):', followUps[0].count);

  // 2. Recommendations
  const [recommendations] = await connection.query(`
    SELECT COUNT(*) as count FROM followup_item_recommendations WHERE status = 'submitted'
  `);
  console.log('2. Recommendations (submitted):', recommendations[0].count);

  // 3. Reports needing revision
  const [reportsNeedingRevision] = await connection.query(`
    SELECT COUNT(*) as count 
    FROM reports r
    WHERE r.status = 'needs_revision' 
      AND NOT EXISTS (
        SELECT 1 FROM revision_items ri 
        WHERE ri.report_id = r.id
      )
  `);
  console.log('3. Reports needing revision:', reportsNeedingRevision[0].count);

  // 4. Completed revisions
  const [completedRevisions] = await connection.query(`
    SELECT COUNT(*) as count FROM revision_items WHERE status = 'completed'
  `);
  console.log('4. Completed revisions:', completedRevisions[0].count);

  // 5. Matrix items
  const [matrixItems] = await connection.query(`
    SELECT COUNT(*) as count FROM matrix_items WHERE status = 'submitted'
  `);
  console.log('5. Matrix items (submitted):', matrixItems[0].count);

  // 6. Evidence files
  const [evidence] = await connection.query(`
    SELECT COUNT(*) as count FROM evidence_files WHERE status = 'pending'
  `);
  console.log('6. Evidence files (pending):', evidence[0].count);

  const total = parseInt(followUps[0].count) + 
                parseInt(recommendations[0].count) + 
                parseInt(reportsNeedingRevision[0].count) + 
                parseInt(completedRevisions[0].count) + 
                parseInt(matrixItems[0].count) + 
                parseInt(evidence[0].count);

  console.log('\n=== TOTAL COUNT:', total, '===');

  // Now check what getAllPendingReviews would return
  console.log('\n=== CHECKING getAllPendingReviews QUERIES ===\n');

  // Follow-ups with JOINs
  const [followUpsWithJoin] = await connection.query(`
    SELECT COUNT(*) as count
    FROM follow_ups f
    JOIN reports r ON f.report_id = r.id
    JOIN users u ON f.user_id = u.id
    WHERE f.status = 'pending_approval'
  `);
  console.log('Follow-ups with JOINs:', followUpsWithJoin[0].count);

  // Recommendations with JOINs
  const [recommendationsWithJoin] = await connection.query(`
    SELECT COUNT(*) as count
    FROM followup_item_recommendations fir
    JOIN followup_items fi ON fir.followup_item_id = fi.id
    JOIN reports r ON fi.report_id = r.id
    JOIN users u ON r.created_by = u.id
    WHERE fir.status = 'submitted'
  `);
  console.log('Recommendations with JOINs:', recommendationsWithJoin[0].count);

  // Matrix items with JOINs
  const [matrixItemsWithJoin] = await connection.query(`
    SELECT COUNT(*) as count
    FROM matrix_items mi
    JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
    WHERE mi.status = 'submitted'
  `);
  console.log('Matrix items with JOINs:', matrixItemsWithJoin[0].count);

  // Evidence with JOINs
  const [evidenceWithJoin] = await connection.query(`
    SELECT COUNT(*) as count
    FROM evidence_files ef
    JOIN users u ON ef.uploaded_by = u.id
    WHERE ef.status = 'pending'
  `);
  console.log('Evidence with JOINs:', evidenceWithJoin[0].count);

  const totalWithJoins = parseInt(followUpsWithJoin[0].count) + 
                         parseInt(recommendationsWithJoin[0].count) + 
                         parseInt(matrixItemsWithJoin[0].count) + 
                         parseInt(evidenceWithJoin[0].count);

  console.log('\n=== TOTAL WITH JOINS:', totalWithJoins, '===');
  console.log('\n=== MISSING FROM getAllPendingReviews:', total - totalWithJoins, '===');

  await connection.end();
}

checkPendingReviews().catch(console.error);
