import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export interface FileImport {
  id: string;
  admin_id: string;
  file_name: string;
  file_path: string;
  file_type: 'xlsx' | 'xls' | 'csv';
  column_mapping: Record<string, string>;
  total_rows: number;
  success_count: number;
  failure_count: number;
  duplicate_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface ImportedReport {
  id: string;
  import_id: string;
  report_id: string;
  row_number: number;
  original_data: Record<string, any>;
  created_at: Date;
}

export interface ImportError {
  id: string;
  import_id: string;
  row_number: number;
  error_message: string;
  row_data: Record<string, any>;
  created_at: Date;
}

export class FileImportModel {
  static async create(data: Omit<FileImport, 'id' | 'created_at'>): Promise<FileImport> {
    const id = uuidv4();
    const sql = `
      INSERT INTO file_imports (
        id, admin_id, file_name, file_path, file_type, 
        column_mapping, total_rows, success_count, failure_count, 
        duplicate_count, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      data.admin_id,
      data.file_name,
      data.file_path,
      data.file_type,
      JSON.stringify(data.column_mapping),
      data.total_rows,
      data.success_count,
      data.failure_count,
      data.duplicate_count,
      data.status,
      data.error_message || null
    ];

    await query(sql, values);

    return {
      id,
      ...data,
      created_at: new Date()
    };
  }

  static async getById(id: string): Promise<FileImport | null> {
    const sql = 'SELECT * FROM file_imports WHERE id = ?';
    const result = await query(sql, [id]);
    
    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return {
      ...row,
      column_mapping: JSON.parse(row.column_mapping)
    };
  }

  static async getByAdminId(adminId: string, limit = 50, offset = 0): Promise<FileImport[]> {
    const sql = `
      SELECT * FROM file_imports 
      WHERE admin_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const result = await query(sql, [adminId, limit, offset]);

    return (result.rows as any[]).map(row => ({
      ...row,
      column_mapping: JSON.parse(row.column_mapping)
    }));
  }

  static async getAll(limit = 50, offset = 0): Promise<FileImport[]> {
    const sql = `
      SELECT * FROM file_imports 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const result = await query(sql, [limit, offset]);

    return (result.rows as any[]).map(row => ({
      ...row,
      column_mapping: JSON.parse(row.column_mapping)
    }));
  }

  static async update(id: string, data: Partial<FileImport>): Promise<FileImport | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.success_count !== undefined) {
      updates.push('success_count = ?');
      values.push(data.success_count);
    }
    if (data.failure_count !== undefined) {
      updates.push('failure_count = ?');
      values.push(data.failure_count);
    }
    if (data.duplicate_count !== undefined) {
      updates.push('duplicate_count = ?');
      values.push(data.duplicate_count);
    }
    if (data.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(data.error_message);
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE file_imports SET ${updates.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return this.getById(id);
  }
}

export class ImportedReportModel {
  static async create(data: Omit<ImportedReport, 'id' | 'created_at'>): Promise<ImportedReport> {
    const id = uuidv4();
    const sql = `
      INSERT INTO imported_reports (
        id, import_id, report_id, row_number, original_data
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      data.import_id,
      data.report_id,
      data.row_number,
      JSON.stringify(data.original_data)
    ];

    await query(sql, values);

    return {
      id,
      ...data,
      created_at: new Date()
    };
  }

  static async getByImportId(importId: string): Promise<ImportedReport[]> {
    const sql = `
      SELECT * FROM imported_reports 
      WHERE import_id = ? 
      ORDER BY row_number ASC
    `;
    const result = await query(sql, [importId]);

    return (result.rows as any[]).map(row => ({
      ...row,
      original_data: JSON.parse(row.original_data)
    }));
  }

  static async getByReportId(reportId: string): Promise<ImportedReport[]> {
    const sql = `
      SELECT * FROM imported_reports 
      WHERE report_id = ? 
      ORDER BY row_number ASC
    `;
    const result = await query(sql, [reportId]);

    return (result.rows as any[]).map(row => ({
      ...row,
      original_data: JSON.parse(row.original_data)
    }));
  }
}

export class ImportErrorModel {
  static async create(data: Omit<ImportError, 'id' | 'created_at'>): Promise<ImportError> {
    const id = uuidv4();
    const sql = `
      INSERT INTO import_errors (
        id, import_id, row_number, error_message, row_data
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      data.import_id,
      data.row_number,
      data.error_message,
      JSON.stringify(data.row_data)
    ];

    await query(sql, values);

    return {
      id,
      ...data,
      created_at: new Date()
    };
  }

  static async getByImportId(importId: string): Promise<ImportError[]> {
    const sql = `
      SELECT * FROM import_errors 
      WHERE import_id = ? 
      ORDER BY row_number ASC
    `;
    const result = await query(sql, [importId]);

    return (result.rows as any[]).map(row => ({
      ...row,
      row_data: JSON.parse(row.row_data)
    }));
  }

  static async deleteByImportId(importId: string): Promise<void> {
    const sql = 'DELETE FROM import_errors WHERE import_id = ?';
    await query(sql, [importId]);
  }
}
