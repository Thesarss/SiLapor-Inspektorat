import { query } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface MatrixReport {
  id: string;
  title: string;
  description?: string;
  uploaded_by: string;
  target_opd: string;
  original_filename: string;
  file_path: string;
  status: 'draft' | 'active' | 'completed';
  total_items: number;
  completed_items: number;
  created_at: Date;
  updated_at: Date;
}

export interface MatrixItem {
  id: string;
  matrix_report_id: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  evidence_filename?: string;
  evidence_file_path?: string;
  evidence_file_size?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MatrixAssignment {
  id: string;
  matrix_report_id: string;
  assigned_to: string;
  assigned_by: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: Date;
  started_at?: Date;
  completed_at?: Date;
  notes?: string;
}

export class MatrixModel {
  // Matrix Reports
  static async createReport(data: Omit<MatrixReport, 'created_at' | 'updated_at'>): Promise<string> {
    const result = await query<ResultSetHeader>(`
      INSERT INTO matrix_reports (
        id, title, description, uploaded_by, target_opd, 
        original_filename, file_path, status, total_items, completed_items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.id, data.title, data.description, data.uploaded_by, 
      data.target_opd, data.original_filename, data.file_path, 
      data.status, data.total_items, data.completed_items
    ]);
    
    return data.id;
  }

  static async getReportById(id: string): Promise<MatrixReport | null> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_reports WHERE id = ?
    `, [id]);
    
    return result.rows.length > 0 ? result.rows[0] as MatrixReport : null;
  }

  static async getReportsByUploader(uploaderId: string): Promise<MatrixReport[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_reports 
      WHERE uploaded_by = ? 
      ORDER BY created_at DESC
    `, [uploaderId]);
    
    return result.rows as MatrixReport[];
  }

  static async getAllReports(): Promise<MatrixReport[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_reports 
      ORDER BY created_at DESC
    `);
    
    return result.rows as MatrixReport[];
  }

  static async updateReportProgress(reportId: string): Promise<void> {
    await query(`
      UPDATE matrix_reports mr
      SET completed_items = (
        SELECT COUNT(*) 
        FROM matrix_items mi 
        WHERE mi.matrix_report_id = mr.id 
        AND mi.status IN ('submitted', 'approved')
      ),
      status = CASE 
        WHEN (SELECT COUNT(*) FROM matrix_items WHERE matrix_report_id = mr.id AND status IN ('submitted', 'approved')) = mr.total_items 
        THEN 'completed'
        ELSE 'active'
      END
      WHERE id = ?
    `, [reportId]);
  }

  // Matrix Items
  static async createItem(data: Omit<MatrixItem, 'created_at' | 'updated_at'>): Promise<string> {
    const result = await query<ResultSetHeader>(`
      INSERT INTO matrix_items (
        id, matrix_report_id, item_number, temuan, penyebab, rekomendasi, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.id, data.matrix_report_id, data.item_number, 
      data.temuan, data.penyebab, data.rekomendasi, data.status
    ]);
    
    return data.id;
  }

  static async getItemById(id: string): Promise<MatrixItem | null> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_items WHERE id = ?
    `, [id]);
    
    return result.rows.length > 0 ? result.rows[0] as MatrixItem : null;
  }

  static async getItemsByReportId(reportId: string): Promise<MatrixItem[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_items 
      WHERE matrix_report_id = ? 
      ORDER BY item_number ASC
    `, [reportId]);
    
    return result.rows as MatrixItem[];
  }

  static async updateItemTindakLanjut(
    itemId: string, 
    tindakLanjut: string, 
    evidenceData?: {
      filename: string;
      filePath: string;
      fileSize: number;
    }
  ): Promise<void> {
    let sql = `
      UPDATE matrix_items 
      SET tindak_lanjut = ?, status = 'submitted'
    `;
    let params: any[] = [tindakLanjut];

    if (evidenceData) {
      sql += `, evidence_filename = ?, evidence_file_path = ?, evidence_file_size = ?`;
      params.push(evidenceData.filename, evidenceData.filePath, evidenceData.fileSize);
    }

    sql += ` WHERE id = ?`;
    params.push(itemId);

    await query(sql, params);
  }

  static async reviewItem(
    itemId: string, 
    reviewerId: string, 
    status: 'approved' | 'rejected', 
    reviewNotes?: string
  ): Promise<void> {
    await query(`
      UPDATE matrix_items 
      SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, reviewerId, reviewNotes, itemId]);
  }

  // Matrix Assignments
  static async createAssignment(data: Omit<MatrixAssignment, 'assigned_at'>): Promise<string> {
    const result = await query<ResultSetHeader>(`
      INSERT INTO matrix_assignments (
        id, matrix_report_id, assigned_to, assigned_by, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.id, data.matrix_report_id, data.assigned_to, 
      data.assigned_by, data.status, data.notes
    ]);
    
    return data.id;
  }

  static async getAssignmentById(id: string): Promise<MatrixAssignment | null> {
    const result = await query<RowDataPacket[]>(`
      SELECT * FROM matrix_assignments WHERE id = ?
    `, [id]);
    
    return result.rows.length > 0 ? result.rows[0] as MatrixAssignment : null;
  }

  static async getAssignmentsByUserId(userId: string): Promise<any[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT 
        ma.*,
        mr.title,
        mr.description,
        mr.original_filename,
        mr.total_items,
        mr.completed_items,
        u.name as assigned_by_name
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_by = u.id
      WHERE ma.assigned_to = ?
      ORDER BY ma.assigned_at DESC
    `, [userId]);
    
    return result.rows;
  }

  static async updateAssignmentStatus(
    assignmentId: string, 
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<void> {
    let sql = `UPDATE matrix_assignments SET status = ?`;
    let params: any[] = [status];

    if (status === 'in_progress') {
      sql += `, started_at = NOW()`;
    } else if (status === 'completed') {
      sql += `, completed_at = NOW()`;
    }

    sql += ` WHERE id = ?`;
    params.push(assignmentId);

    await query(sql, params);
  }

  // Statistics
  static async getStatisticsByUser(userId: string, userRole: string): Promise<any> {
    if (userRole === 'inspektorat' || userRole === 'super_admin') {
      // Statistics for Inspektorat
      const [reports, assignments, items] = await Promise.all([
        query<RowDataPacket[]>(`
          SELECT COUNT(*) as count, status 
          FROM matrix_reports 
          WHERE uploaded_by = ? 
          GROUP BY status
        `, [userId]),
        query<RowDataPacket[]>(`
          SELECT COUNT(*) as count, ma.status 
          FROM matrix_assignments ma 
          WHERE assigned_by = ? 
          GROUP BY ma.status
        `, [userId]),
        query<RowDataPacket[]>(`
          SELECT COUNT(*) as count, mi.status 
          FROM matrix_items mi 
          JOIN matrix_reports mr ON mi.matrix_report_id = mr.id 
          WHERE mr.uploaded_by = ? 
          GROUP BY mi.status
        `, [userId])
      ]);

      return {
        reports: reports.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
        assignments: assignments.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
        items: items.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {})
      };
    } else {
      // Statistics for OPD
      const [assignments, items] = await Promise.all([
        query<RowDataPacket[]>(`
          SELECT COUNT(*) as count, ma.status 
          FROM matrix_assignments ma 
          WHERE assigned_to = ? 
          GROUP BY ma.status
        `, [userId]),
        query<RowDataPacket[]>(`
          SELECT COUNT(*) as count, mi.status 
          FROM matrix_items mi 
          JOIN matrix_assignments ma ON mi.matrix_report_id = ma.matrix_report_id 
          WHERE ma.assigned_to = ? 
          GROUP BY mi.status
        `, [userId])
      ]);

      return {
        assignments: assignments.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
        items: items.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {})
      };
    }
  }

  // Utility methods
  static async getInstitutions(): Promise<string[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT DISTINCT institution 
      FROM users 
      WHERE role = 'opd' AND institution IS NOT NULL 
      ORDER BY institution
    `);
    
    return result.rows.map(row => row.institution);
  }

  static async getOPDUsersByInstitution(institution: string): Promise<any[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT id, name, email, institution 
      FROM users 
      WHERE role = 'opd' AND institution = ?
    `, [institution]);
    
    return result.rows;
  }
}