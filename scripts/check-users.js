const mysql = require('mysql2/promise');

async function checkUsers() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'evaluation_reporting'
    });
    
    const [rows] = await conn.query('SELECT username, role, institution FROM users LIMIT 10');
    
    console.log('Users in database:');
    if (rows.length === 0) {
      console.log('❌ No users found in database');
    } else {
      rows.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ${user.institution || 'No institution'}`);
      });
    }
    
    await conn.end();
  } catch (error) {
    console.log('❌ Error checking users:', error.message);
  }
}

checkUsers();