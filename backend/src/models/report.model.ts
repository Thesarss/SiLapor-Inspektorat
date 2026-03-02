import { query } from '../config/database';
import { Report, ReportStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

interface ReportRow extends RowDataPacket, Report {}

export interface ReportFilters {
  status?: ReportStatus;
  assignedUserId?: string;
  createdBy?: string;
  search?: string;
  institution?: string;
  dateFrom?: string;
  dateTo?: string;
  nomorLHP?: string;
}

export const ReportModel = {
  async create(
    title: string,
    description: string,
    createdBy: string,
    assignedTo: string
  ): Promise<Report> {
    const id = uuidv4();
    await query(
      `INSERT INTO reports (id, title, description, created_by, assigned_to, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, title, description, createdBy, assignedTo]
    );
    const report = await this.findById(id);
    return report!;
  },

  async findById(id: string): Promise<Report | null> {
    const result = await query<ReportRow[]>('SELECT * FROM reports WHERE id = ?', [id]);
    return result.rows[0] || null;
  },

  async findAll(filters?: ReportFilters): Promise<Report[]> {
    let sql = `
      SELECT r.*, 
             creator.name as creator_name, 
             creator.institution as creator_institution,
             assignee.name as assignee_name,
             assignee.institution as assignee_institution
      FROM reports r 
      LEFT JOIN users creator ON r.created_by = creator.id 
      LEFT JOIN users assignee ON r.assigned_to = assignee.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND r.status = ?';
      params.push(filters.status);
    }

    if (filters?.assignedUserId) {
      sql += ' AND r.assigned_to = ?';
      params.push(filters.assignedUserId);
    }

    if (filters?.createdBy) {
      sql += ' AND r.created_by = ?';
      params.push(filters.createdBy);
    }

    if (filters?.institution) {
      sql += ' AND assignee.institution = ?';
      params.push(filters.institution);
    }

    if (filters?.dateFrom) {
      sql += ' AND DATE(r.created_at) >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      sql += ' AND DATE(r.created_at) <= ?';
      params.push(filters.dateTo);
    }

    if (filters?.search) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR creator.name LIKE ? OR r.nomor_lhp LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters?.nomorLHP) {
      sql += ' AND r.nomor_lhp LIKE ?';
      params.push(`%${filters.nomorLHP}%`);
    }

    sql += ' ORDER BY r.created_at DESC';

    const result = await query<ReportRow[]>(sql, params);
    return result.rows;
  },

  async findByAssignedUser(userId: string): Promise<Report[]> {
    const result = await query<ReportRow[]>(
      'SELECT * FROM reports WHERE assigned_to = ? ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async updateStatus(id: string, status: ReportStatus, rejectionNotes?: string): Promise<Report | null> {
    if (rejectionNotes) {
      await query('UPDATE reports SET status = ?, rejection_notes = ? WHERE id = ?', [status, rejectionNotes, id]);
    } else {
      await query('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
    }
    return this.findById(id);
  },

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    approved: number;
    rejected: number;
  }> {
    const result = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM reports
    `);
    const row = result.rows[0];
    return {
      total: Number(row.total) || 0,
      pending: Number(row.pending) || 0,
      in_progress: Number(row.in_progress) || 0,
      approved: Number(row.approved) || 0,
      rejected: Number(row.rejected) || 0,
    };
  },

  async resubmit(id: string): Promise<Report | null> {
    await query('UPDATE reports SET status = ?, rejection_notes = NULL WHERE id = ?', ['pending', id]);
    return this.findById(id);
  },

  async updateRecommendation(id: string, recommendation: string): Promise<Report | null> {
    await query('UPDATE reports SET recommendation = ? WHERE id = ?', [recommendation, id]);
    return this.findById(id);
  },

  async findByNomorLHP(nomorLHP: string): Promise<Report | null> {
    const result = await query<ReportRow[]>(
      'SELECT * FROM reports WHERE nomor_lhp = ?',
      [nomorLHP]
    );
    return result.rows[0] || null;
  },

  async getInstitutions(): Promise<string[]> {
    // Get all institutions from users with role 'opd'
    const result = await query<RowDataPacket[]>(`
      SELECT DISTINCT institution 
      FROM users 
      WHERE institution IS NOT NULL AND institution != '' AND role = 'opd'
      ORDER BY institution
    `);
    
    return result.rows.map(row => row.institution);
  },

  async getNomorLHPList(): Promise<string[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT DISTINCT nomor_lhp 
      FROM reports 
      WHERE nomor_lhp IS NOT NULL AND nomor_lhp != ''
      ORDER BY nomor_lhp
    `);
    return result.rows.map(row => row.nomor_lhp);
  },

  async getAvailableYears(): Promise<string[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT DISTINCT YEAR(created_at) as year 
      FROM reports 
      ORDER BY year DESC
    `);
    return result.rows.map(row => row.year.toString());
  },

  async getInstitutionsWithCounts(): Promise<{ name: string; count: number }[]> {
    const result = await query<RowDataPacket[]>(`
      SELECT 
        assignee.institution as name,
        COUNT(*) as count
      FROM reports r 
      JOIN users assignee ON r.assigned_to = assignee.id 
      WHERE assignee.institution IS NOT NULL AND assignee.institution != ''
      GROUP BY assignee.institution
      ORDER BY assignee.institution
    `);
    return result.rows.map(row => ({
      name: row.name,
      count: Number(row.count)
    }));
  },

  async getReportCountByInstitution(institution: string): Promise<number> {
    const result = await query<RowDataPacket[]>(`
      SELECT COUNT(*) as count
      FROM reports r 
      JOIN users assignee ON r.assigned_to = assignee.id 
      WHERE assignee.institution = ?
    `, [institution]);
    return Number(result.rows[0]?.count) || 0;
  },
};
