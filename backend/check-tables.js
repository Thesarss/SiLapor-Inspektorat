const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'evaluation_reporting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Checking all tables in database...\n');
    
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log(`Total tables: ${tables.length}\n`);
    console.log('Tables:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    console.log('\n---\n');
    
    // Check each table's row count
    console.log('Row counts:');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`${tableName}: ${count[0].count} rows`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();
