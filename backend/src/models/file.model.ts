import { query } from '../config/database';
import { EvidenceFile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

interface FileRow extends RowDataPacket, EvidenceFile {}

export const FileModel = {
  async create(
    followUpId: string,
    originalName: string,
    storedName: string,
    filePath: string,
    fileSize: number
  ): Promise<EvidenceFile> {
    const id = uuidv4();
    await query(
      `INSERT INTO evidence_files (id, follow_up_id, original_name, stored_name, file_path, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, followUpId, originalName, storedName, filePath, fileSize]
    );
    const file = await this.findById(id);
    return file!;
  },

  async createForReport(
    reportId: string,
    originalName: string,
    storedName: string,
    filePath: string,
    fileSize: number
  ): Promise<EvidenceFile> {
    const id = uuidv4();
    await query(
      `INSERT INTO evidence_files (id, report_id, original_name, stored_name, file_path, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, reportId, originalName, storedName, filePath, fileSize]
    );
    const file = await this.findById(id);
    return file!;
  },

  async findById(id: string): Promise<EvidenceFile | null> {
    const result = await query<FileRow[]>('SELECT * FROM evidence_files WHERE id = ?', [id]);
    return result.rows[0] || null;
  },

  async findByFollowUpId(followUpId: string): Promise<EvidenceFile[]> {
    const result = await query<FileRow[]>(
      'SELECT * FROM evidence_files WHERE follow_up_id = ? ORDER BY uploaded_at ASC',
      [followUpId]
    );
    return result.rows;
  },

  async findByReportId(reportId: string): Promise<EvidenceFile[]> {
    const result = await query<FileRow[]>(
      'SELECT * FROM evidence_files WHERE report_id = ? ORDER BY uploaded_at ASC',
      [reportId]
    );
    return result.rows;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM evidence_files WHERE id = ?', [id]);
    return result.rowCount > 0;
  },
};
