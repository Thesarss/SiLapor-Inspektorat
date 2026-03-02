import { query } from '../config/database';
import { FollowUp, FollowUpStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

interface FollowUpRow extends RowDataPacket, FollowUp {}

export const FollowUpModel = {
  async create(reportId: string, userId: string, content: string): Promise<FollowUp> {
    const id = uuidv4();
    await query(
      `INSERT INTO follow_ups (id, report_id, user_id, content, status)
       VALUES (?, ?, ?, ?, 'pending_approval')`,
      [id, reportId, userId, content]
    );
    const followUp = await this.findById(id);
    return followUp!;
  },

  async findById(id: string): Promise<FollowUp | null> {
    const result = await query<FollowUpRow[]>('SELECT * FROM follow_ups WHERE id = ?', [id]);
    return result.rows[0] || null;
  },

  async findByReportId(reportId: string): Promise<FollowUp | null> {
    const result = await query<FollowUpRow[]>('SELECT * FROM follow_ups WHERE report_id = ?', [reportId]);
    return result.rows[0] || null;
  },

  async findPending(): Promise<FollowUp[]> {
    const result = await query<FollowUpRow[]>(
      "SELECT * FROM follow_ups WHERE status = 'pending_approval' ORDER BY created_at ASC"
    );
    return result.rows;
  },

  async update(id: string, content: string): Promise<FollowUp | null> {
    await query('UPDATE follow_ups SET content = ? WHERE id = ?', [content, id]);
    return this.findById(id);
  },

  async updateStatus(
    id: string,
    status: FollowUpStatus,
    reviewedBy: string,
    adminNotes?: string
  ): Promise<FollowUp | null> {
    await query(
      `UPDATE follow_ups 
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), admin_notes = ?
       WHERE id = ?`,
      [status, reviewedBy, adminNotes || null, id]
    );
    return this.findById(id);
  },

  canEdit(followUp: FollowUp): boolean {
    return followUp.status === 'pending_approval' || followUp.status === 'rejected';
  },
};
