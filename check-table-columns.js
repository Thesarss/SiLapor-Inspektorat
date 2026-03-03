const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkTableColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lhp_system'
  });

  console.log('=== CHECKING TABLE COLUMNS ===\n');

  // Check followup_item_recommendations
  console.log('1. followup_item_recommendations columns:');
  const [firColumns] = await connection.query(`
    SHOW COLUMNS FROM followup_item_recommendations
  `);
  console.table(firColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

  // Check follow_ups
  console.log('\n2. follow_ups columns:');
  const [fuColumns] = await connection.query(`
    SHOW COLUMNS FROM follow_ups
  `);
  console.table(fuColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

  // Check matrix_items
  console.log('\n3. matrix_items columns:');
  const [miColumns] = await connection.query(`
    SHOW COLUMNS FROM matrix_items
  `);
  console.table(miColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

  // Check evidence_files
  console.log('\n4. evidence_files columns:');
  const [efColumns] = await connection.query(`
    SHOW COLUMNS FROM evidence_files
  `);
  console.table(efColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));

  await connection.end();
}

checkTableColumns().catch(console.error);
