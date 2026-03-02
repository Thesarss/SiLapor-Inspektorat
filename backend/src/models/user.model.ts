import { query } from '../config/database';
import { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket, User {}

export const UserModel = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
    return result.rows[0] || null;
  },

  async findByUsername(username: string): Promise<User | null> {
    const result = await query<UserRow[]>('SELECT * FROM users WHERE username = ?', [username]);
    return result.rows[0] || null;
  },

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const result = await query<UserRow[]>(
      'SELECT * FROM users WHERE email = ? OR username = ?', 
      [identifier, identifier]
    );
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    return result.rows[0] || null;
  },

  async findAll(): Promise<User[]> {
    const result = await query<UserRow[]>('SELECT id, username, email, name, institution, role, created_at, updated_at FROM users');
    return result.rows;
  },

  async getInstitutions(): Promise<string[]> {
    const result = await query<RowDataPacket[]>(
      'SELECT DISTINCT institution FROM users WHERE institution IS NOT NULL AND institution != "" ORDER BY institution'
    );
    return result.rows.map((row: any) => row.institution);
  },

  async updateInstitution(userId: string, institution: string): Promise<User | null> {
    await query('UPDATE users SET institution = ? WHERE id = ?', [institution, userId]);
    return this.findById(userId);
  },

  async findByRole(role: UserRole): Promise<User[]> {
    const result = await query<UserRow[]>(
      'SELECT id, username, email, name, role, institution, created_at, updated_at FROM users WHERE role = ?',
      [role]
    );
    return result.rows;
  },

  async create(userData: {
    username: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    institution?: string;
  }): Promise<User> {
    const id = uuidv4();
    await query(
      'INSERT INTO users (id, username, email, password_hash, name, role, institution) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userData.username, userData.email, userData.passwordHash, userData.name, userData.role, userData.institution || null]
    );
    const user = await this.findById(id);
    return user!;
  },

  async findByInstitution(institution: string): Promise<User | null> {
    const result = await query<UserRow[]>(
      'SELECT * FROM users WHERE institution = ? LIMIT 1',
      [institution]
    );
    return result.rows[0] || null;
  },

  async checkUsernameExists(username: string): Promise<boolean> {
    const result = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      [username]
    );
    return result.rows[0].count > 0;
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const result = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return result.rows[0].count > 0;
  },

  async updateUser(id: string, userData: {
    username?: string;
    email?: string;
    name?: string;
    institution?: string;
  }): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (userData.username) {
      updates.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email) {
      updates.push('email = ?');
      values.push(userData.email);
    }
    if (userData.name) {
      updates.push('name = ?');
      values.push(userData.name);
    }
    if (userData.institution !== undefined) {
      updates.push('institution = ?');
      values.push(userData.institution);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  },

  async deleteUser(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = ? AND role != "admin"', [id]);
    return result.rowCount > 0;
  },

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
  }
};
