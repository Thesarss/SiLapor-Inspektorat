import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export type RevisionStatus = 'pending' | 'completed' | 'approved';

export interface RevisionItem {
  id: string;
  report_id: string;
  item_number: number;
  description: string;
  status: RevisionStatus;
  user_response: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionFile {
  id: string;
  revision_item_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

interface RevisionItemRow extends RowDataPacket, RevisionItem {}
interface RevisionFileRow extends RowDataPacket, RevisionFile {}

export const RevisionModel = {
  // Revision Items
  async createItem(
    reportId: string,
    itemNumber: number,
    description: string
  ): Promise<RevisionItem> {
    const id = uuidv4();
    await query(
      `INSERT INTO revision_items (id, report_id, item_number, description, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [id, reportId, itemNumber, description]
    );
    const item = await this.findItemById(id);
    return item!;
  },

  async findItemById(id: string): Promise<RevisionItem | null> {
    const result = await query<RevisionItemRow[]>(
      'SELECT * FROM revision_items WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  },

  async findItemsByReport(reportId: string): Promise<RevisionItem[]> {
    const result = await query<RevisionItemRow[]>(
      'SELECT * FROM revision_items WHERE report_id = ? ORDER BY item_number ASC',
      [reportId]
    );
    return result.rows;
  },

  async updateItemResponse(
    id: string,
    userResponse: string,
    status: RevisionStatus
  ): Promise<RevisionItem | null> {
    await query(
      'UPDATE revision_items SET user_response = ?, status = ? WHERE id = ?',
      [userResponse, status, id]
    );
    return this.findItemById(id);
  },

  async updateItemStatus(id: string, status: RevisionStatus, adminNotes?: string): Promise<RevisionItem | null> {
    if (adminNotes) {
      await query(
        'UPDATE revision_items SET status = ?, admin_notes = ? WHERE id = ?',
        [status, adminNotes, id]
      );
    } else {
      await query(
        'UPDATE revision_items SET status = ? WHERE id = ?',
        [status, id]
      );
    }
    return this.findItemById(id);
  },

  async deleteItem(id: string): Promise<boolean> {
    const result = await query('DELETE FROM revision_items WHERE id = ?', [id]);
    return result.rowCount > 0;
  },

  async deleteItemsByReport(reportId: string): Promise<boolean> {
    const result = await query('DELETE FROM revision_items WHERE report_id = ?', [reportId]);
    return result.rowCount > 0;
  },

  // Revision Files
  async createFile(
    revisionItemId: string,
    originalName: string,
    storedName: string,
    filePath: string,
    fileSize: number
  ): Promise<RevisionFile> {
    const id = uuidv4();
    await query(
      `INSERT INTO revision_files (id, revision_item_id, original_name, stored_name, file_path, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, revisionItemId, originalName, storedName, filePath, fileSize]
    );
    const file = await this.findFileById(id);
    return file!;
  },

  async findFileById(id: string): Promise<RevisionFile | null> {
    const result = await query<RevisionFileRow[]>(
      'SELECT * FROM revision_files WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  },

  async findFilesByRevisionItem(revisionItemId: string): Promise<RevisionFile[]> {
    const result = await query<RevisionFileRow[]>(
      'SELECT * FROM revision_files WHERE revision_item_id = ? ORDER BY uploaded_at ASC',
      [revisionItemId]
    );
    return result.rows;
  },

  async deleteFile(id: string): Promise<boolean> {
    const result = await query('DELETE FROM revision_files WHERE id = ?', [id]);
    return result.rowCount > 0;
  },
};
