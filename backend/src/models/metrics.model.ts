import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

export interface FindingsCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Metric {
  id: string;
  report_id: string;
  category_id: string;
  title: string;
  description?: string;
  finding_number?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  file_name?: string;
  file_path?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
  category?: FindingsCategory;
}

interface MetricRow extends RowDataPacket, Metric {}
interface CategoryRow extends RowDataPacket, FindingsCategory {}

export const MetricsModel = {
  // Categories
  async getAllCategories(): Promise<FindingsCategory[]> {
    const result = await query<CategoryRow[]>(
      'SELECT * FROM findings_categories ORDER BY sort_order ASC'
    );
    return result.rows;
  },

  async getCategoryById(id: string): Promise<FindingsCategory | null> {
    const result = await query<CategoryRow[]>(
      'SELECT * FROM findings_categories WHERE id = ?',
      [id]
    );
    return result.rows[0] || null;
  },

  // Metrics
  async create(
    reportId: string,
    categoryId: string,
    title: string,
    description: string,
    findingNumber: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    fileName: string,
    filePath: string,
    fileSize: number,
    uploadedBy: string
  ): Promise<Metric> {
    const id = uuidv4();
    await query(
      `INSERT INTO metrics 
       (id, report_id, category_id, title, description, finding_number, severity, file_name, file_path, file_size, uploaded_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [id, reportId, categoryId, title, description, findingNumber, severity, fileName, filePath, fileSize, uploadedBy]
    );
    return this.findById(id) as Promise<Metric>;
  },

  async findById(id: string): Promise<Metric | null> {
    const result = await query<MetricRow[]>(
      `SELECT m.*, c.name as category_name, c.color, c.icon
       FROM metrics m
       LEFT JOIN findings_categories c ON m.category_id = c.id
       WHERE m.id = ?`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByReportId(reportId: string): Promise<Metric[]> {
    const result = await query<MetricRow[]>(
      `SELECT m.*, c.name as category_name, c.color, c.icon
       FROM metrics m
       LEFT JOIN findings_categories c ON m.category_id = c.id
       WHERE m.report_id = ?
       ORDER BY c.sort_order ASC, m.created_at DESC`,
      [reportId]
    );
    return result.rows;
  },

  async findByReportAndCategory(reportId: string, categoryId: string): Promise<Metric[]> {
    const result = await query<MetricRow[]>(
      `SELECT m.*, c.name as category_name, c.color, c.icon
       FROM metrics m
       LEFT JOIN findings_categories c ON m.category_id = c.id
       WHERE m.report_id = ? AND m.category_id = ?
       ORDER BY m.created_at DESC`,
      [reportId, categoryId]
    );
    return result.rows;
  },

  async updateStatus(
    id: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<Metric | null> {
    await query('UPDATE metrics SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM metrics WHERE id = ?', [id]);
    return result.rowCount > 0;
  },

  async getMetricsByReportGroupedByCategory(reportId: string): Promise<Map<string, Metric[]>> {
    const metrics = await this.findByReportId(reportId);
    const grouped = new Map<string, Metric[]>();

    for (const metric of metrics) {
      const categoryName = metric.category?.name || 'Lain-lain';
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, []);
      }
      grouped.get(categoryName)!.push(metric);
    }

    return grouped;
  },

  async getStatistics(reportId: string): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const metrics = await this.findByReportId(reportId);

    const stats = {
      total: metrics.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
      byCategory: {} as Record<string, number>,
    };

    for (const metric of metrics) {
      stats.bySeverity[metric.severity]++;
      stats.byStatus[metric.status]++;
      const categoryName = metric.category?.name || 'Lain-lain';
      stats.byCategory[categoryName] = (stats.byCategory[categoryName] || 0) + 1;
    }

    return stats;
  },
};
