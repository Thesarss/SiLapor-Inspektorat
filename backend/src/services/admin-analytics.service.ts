import { query } from '../config/database';

export interface AdminAnalytics {
  overview: {
    totalTemuan: number;
    totalRekomendasi: number;
    totalOPD: number;
    totalLaporan: number;
  };
  progressChart: {
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
  };
  opdBreakdown: Array<{
    opdName: string;
    institution: string;
    totalRekomendasi: number;
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
    completionRate: number;
  }>;
}

export class AdminAnalyticsService {
  /**
   * Get comprehensive analytics for admin dashboard
   */
  static async getAnalytics(): Promise<AdminAnalytics> {
    // Get overview statistics
    const overview = await this.getOverviewStats();
    
    // Get progress chart data
    const progressChart = await this.getProgressChartData();
    
    // Get OPD breakdown
    const opdBreakdown = await this.getOPDBreakdown();

    return {
      overview,
      progressChart,
      opdBreakdown
    };
  }

  /**
   * Get overview statistics
   */
  private static async getOverviewStats() {
    // Total temuan (followup items)
    const temuanResult = await query(
      'SELECT COUNT(*) as total FROM followup_items'
    );
    const totalTemuan = temuanResult.rows[0]?.total || 0;

    // Total rekomendasi (individual recommendations)
    const rekomendasiResult = await query(
      'SELECT COUNT(*) as total FROM followup_item_recommendations'
    );
    const totalRekomendasi = rekomendasiResult.rows[0]?.total || 0;

    // Total OPD (unique institutions with reports)
    const opdResult = await query(`
      SELECT COUNT(DISTINCT u.institution) as total 
      FROM users u 
      INNER JOIN reports r ON r.assigned_to = u.id 
      WHERE u.role = 'user' AND u.institution IS NOT NULL
    `);
    const totalOPD = opdResult.rows[0]?.total || 0;

    // Total laporan
    const laporanResult = await query(
      'SELECT COUNT(*) as total FROM reports'
    );
    const totalLaporan = laporanResult.rows[0]?.total || 0;

    return {
      totalTemuan,
      totalRekomendasi,
      totalOPD,
      totalLaporan
    };
  }

  /**
   * Get progress chart data based on recommendation status
   */
  private static async getProgressChartData() {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM followup_item_recommendations 
      GROUP BY status
    `);

    const statusCounts = {
      completed: 0,
      inProgress: 0,
      pending: 0,
      rejected: 0
    };

    result.rows.forEach((row: any) => {
      switch (row.status) {
        case 'approved':
          statusCounts.completed += parseInt(row.count);
          break;
        case 'submitted':
          statusCounts.inProgress += parseInt(row.count);
          break;
        case 'pending':
          statusCounts.pending += parseInt(row.count);
          break;
        case 'rejected':
          statusCounts.rejected += parseInt(row.count);
          break;
      }
    });

    return statusCounts;
  }

  /**
   * Get OPD breakdown with completion rates
   */
  private static async getOPDBreakdown() {
    const result = await query(`
      SELECT 
        u.name as opd_name,
        u.institution,
        COALESCE(COUNT(fir.id), 0) as total_rekomendasi,
        COALESCE(SUM(CASE WHEN fir.status = 'approved' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN fir.status = 'submitted' THEN 1 ELSE 0 END), 0) as in_progress,
        COALESCE(SUM(CASE WHEN fir.status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN fir.status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
      FROM users u
      LEFT JOIN reports r ON r.assigned_to = u.id
      LEFT JOIN followup_items fi ON fi.report_id = r.id
      LEFT JOIN followup_item_recommendations fir ON fir.followup_item_id = fi.id
      WHERE u.role = 'user' AND u.institution IS NOT NULL
      GROUP BY u.id, u.name, u.institution
      ORDER BY u.institution, u.name
    `);

    return result.rows.map((row: any) => {
      const totalRekomendasi = parseInt(row.total_rekomendasi);
      const completed = parseInt(row.completed);
      const completionRate = totalRekomendasi > 0 ? Math.round((completed / totalRekomendasi) * 100) : 0;

      return {
        opdName: row.opd_name,
        institution: row.institution,
        totalRekomendasi,
        completed,
        inProgress: parseInt(row.in_progress),
        pending: parseInt(row.pending),
        rejected: parseInt(row.rejected),
        completionRate
      };
    });
  }

  /**
   * Get monthly progress trend
   */
  static async getMonthlyTrend() {
    const result = await query(`
      SELECT 
        DATE_FORMAT(fir.submitted_at, '%Y-%m') as month,
        COUNT(*) as submitted_count,
        SUM(CASE WHEN fir.status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM followup_item_recommendations fir
      WHERE fir.submitted_at IS NOT NULL
        AND fir.submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fir.submitted_at, '%Y-%m')
      ORDER BY month
    `);

    return result.rows;
  }

  /**
   * Get top performing OPDs
   */
  static async getTopPerformingOPDs(limit: number = 5) {
    const result = await query(`
      SELECT 
        u.name as opd_name,
        u.institution,
        COUNT(fir.id) as total_rekomendasi,
        SUM(CASE WHEN fir.status = 'approved' THEN 1 ELSE 0 END) as completed,
        ROUND((SUM(CASE WHEN fir.status = 'approved' THEN 1 ELSE 0 END) / COUNT(fir.id)) * 100, 2) as completion_rate
      FROM users u
      INNER JOIN reports r ON r.assigned_to = u.id
      INNER JOIN followup_items fi ON fi.report_id = r.id
      INNER JOIN followup_item_recommendations fir ON fir.followup_item_id = fi.id
      WHERE u.role = 'user' AND u.institution IS NOT NULL
      GROUP BY u.id, u.name, u.institution
      HAVING COUNT(fir.id) > 0
      ORDER BY completion_rate DESC, completed DESC
      LIMIT ?
    `, [limit]);

    return result.rows;
  }
}