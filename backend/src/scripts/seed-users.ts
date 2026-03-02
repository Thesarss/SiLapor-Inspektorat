import bcrypt from 'bcrypt';
import { pool } from '../config/database';

async function seedUsers() {
  const password = process.env.DEV_PASSWORD || 'DevSecure2024!@#';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Using password:', password);
  console.log('Generated hash:', hash);
  
  try {
    // Delete existing users first
    await pool.execute('DELETE FROM reports');
    await pool.execute('DELETE FROM users');
    
    // Insert users with correct hash
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, name, role) VALUES 
       ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@example.com', ?, 'Admin User', 'admin')`,
      [hash]
    );
    
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, name, role, institution) VALUES 
       ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'user1@example.com', ?, 'User One', 'user', 'Dinas Pendidikan')`,
      [hash]
    );
    
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, name, role, institution) VALUES 
       ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'user2@example.com', ?, 'User Two', 'user', 'Dinas Kesehatan')`,
      [hash]
    );
    
    // Insert sample reports
    await pool.execute(
      `INSERT INTO reports (id, title, description, created_by, assigned_to, status) VALUES 
       ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Laporan Evaluasi Q1 2024', 'Ditemukan ketidaksesuaian pada laporan keuangan Q1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'pending')`
    );
    
    await pool.execute(
      `INSERT INTO reports (id, title, description, created_by, assigned_to, status) VALUES 
       ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Audit Internal', 'Perlu tindak lanjut hasil audit internal', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'pending')`
    );
    
    console.log('✅ Users and reports seeded successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Admin: admin@example.com / ${password}`);
    console.log(`  User1: user1@example.com / ${password}`);
    console.log(`  User2: user2@example.com / ${password}`);
    
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedUsers();
