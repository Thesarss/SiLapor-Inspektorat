const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lhp_system'
  });

  console.log('=== CHECKING USERS ===\n');

  const [users] = await connection.query(`
    SELECT id, username, email, name, role, institution 
    FROM users 
    WHERE role IN ('inspektorat', 'super_admin')
    ORDER BY role, name
  `);

  console.log('Inspektorat and Super Admin users:');
  console.table(users);

  await connection.end();
}

checkUsers().catch(console.error);
