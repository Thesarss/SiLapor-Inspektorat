import mysql, { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'evaluation_reporting',
  waitForConnections: true,
  connectionLimit: 10,
});

export const query = async <T = RowDataPacket[]>(text: string, params?: any[]): Promise<{ rows: T; rowCount: number; insertId?: number }> => {
  // Convert PostgreSQL $1, $2 placeholders to MySQL ?
  const mysqlQuery = text.replace(/\$(\d+)/g, '?');
  // Remove RETURNING clause (not supported in MySQL)
  const cleanQuery = mysqlQuery.replace(/\s+RETURNING\s+\*/gi, '');
  
  const [result] = await pool.execute(cleanQuery, params);
  
  if (Array.isArray(result)) {
    return { rows: result as T, rowCount: result.length };
  }
  
  const header = result as ResultSetHeader;
  return { rows: [] as unknown as T, rowCount: header.affectedRows, insertId: header.insertId };
};

export { pool };
