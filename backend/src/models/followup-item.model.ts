import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export interface FollowupItem {
  id: string;
  report_id: string;
  import_detail_id: string;
  temuan: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  opd_response?: string;
  admin_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FollowupItemFile {
  id: string;
  followup_item_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: Date;
}

export class FollowupItemModel {
  static async create(data: Omit<FollowupItem, 'id' | 'created_at' | 'updated_at'>): Promise<FollowupItem> {
    const id = uuidv4();
    const sql = `
      INSERT INTO followup_items (
        id, report_id, import_detail_id, temuan, rekomendasi, 
        tindak_lanjut, status, opd_response, admin_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      data.report_id,
      data.import_detail_id,
      data.temuan,
      data.rekomendasi,
      data.tindak_lanjut || null,
      data.status,
      data.opd_response || null,
      data.admin_notes || null
    ];

    await query(sql, values);

    return {
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  static async getByReportId(reportId: string): Promise<FollowupItem[]> {
    const sql = `
      SELECT * FROM followup_items 
      WHERE report_id = ? 
      ORDER BY created_at ASC
    `;
    const result = await query(sql, [reportId]);
    return result.rows as FollowupItem[];
  }

  static async getByReportIds(reportIds: string[]): Promise<FollowupItem[]> {
    if (reportIds.length === 0) return [];
    
    const placeholders = reportIds.map(() => '?').join(',');
    const sql = `
      SELECT * FROM followup_items 
      WHERE report_id IN (${placeholders}) 
      ORDER BY created_at ASC
    `;
    const result = await query(sql, reportIds);
    return result.rows as FollowupItem[];
  }

  static async getById(id: string): Promise<FollowupItem | null> {
    const sql = 'SELECT * FROM followup_items WHERE id = ?';
    const result = await query(sql, [id]);
    
    if (!result.rows || result.rows.length === 0) return null;
    return result.rows[0] as FollowupItem;
  }

  static async updateResponse(id: string, opdResponse: string, status: string = 'completed'): Promise<FollowupItem | null> {
    const sql = `
      UPDATE followup_items 
      SET opd_response = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await query(sql, [opdResponse, status, id]);
    return this.getById(id);
  }

  static async updateStatus(id: string, status: string, adminNotes?: string): Promise<FollowupItem | null> {
    const sql = adminNotes 
      ? 'UPDATE followup_items SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE followup_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    const values = adminNotes ? [status, adminNotes, id] : [status, id];
    await query(sql, values);
    return this.getById(id);
  }
}

export class FollowupItemFileModel {
  static async create(data: Omit<FollowupItemFile, 'id' | 'uploaded_at'>): Promise<FollowupItemFile> {
    const id = uuidv4();
    const sql = `
      INSERT INTO followup_item_files (
        id, followup_item_id, original_name, stored_name, 
        file_path, file_size, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      data.followup_item_id,
      data.original_name,
      data.stored_name,
      data.file_path,
      data.file_size,
      data.uploaded_by
    ];

    await query(sql, values);

    return {
      id,
      ...data,
      uploaded_at: new Date()
    };
  }

  static async getByFollowupItemId(followupItemId: string): Promise<FollowupItemFile[]> {
    const sql = `
      SELECT * FROM followup_item_files 
      WHERE followup_item_id = ? 
      ORDER BY uploaded_at ASC
    `;
    const result = await query(sql, [followupItemId]);
    return result.rows as FollowupItemFile[];
  }

  static async getById(id: string): Promise<FollowupItemFile | null> {
    const sql = 'SELECT * FROM followup_item_files WHERE id = ?';
    const result = await query(sql, [id]);
    
    if (!result.rows || result.rows.length === 0) return null;
    return result.rows[0] as FollowupItemFile;
  }

  static async delete(id: string): Promise<void> {
    const sql = 'DELETE FROM followup_item_files WHERE id = ?';
    await query(sql, [id]);
  }
}