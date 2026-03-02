require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'audit_system'
  });
  
  console.log('\nReports table structure:');
  const [cols] = await conn.query('DESCRIBE reports');
  cols.forEach(c => console.log(`  ${c.Field.padEnd(20)} - ${c.Type.padEnd(20)} - Key: ${c.Key}`));
  
  console.log('\nUsers table structure:');
  const [userCols] = await conn.query('DESCRIBE users');
  userCols.forEach(c => console.log(`  ${c.Field.padEnd(20)} - ${c.Type.padEnd(20)} - Key: ${c.Key}`));
  
  await conn.end();
})();
