import { query } from '../config/database';
import { RowDataPacket } from 'mysql2';
import { OPDStatisticsService } from './opd-statistics.service';

export interface SuperAdminDashboard {
    overview: {
        totalReports: number;
        totalMatrix: number;
        totalOPDs: number;
        totalInspektorat: number;
        totalRecommendations: number;
        totalMatrixItems: number;
        overallCompletionRate: number;
    };
    opdPerformance: Array<{
        institution: string;
        opdName: string;
        totalRecommendations: number;
        approvedRecommendations: number;
        completionRate: number;
        rank: number;
        lastActivity: Date | null;
    }>;
    inspektoratPerformance: Array<{
        inspektoratName: string;
        totalMatrixUploaded: number;
        totalReviewsDone: number;
        avgReviewTime: number;
        totalReportsAssigned: number;
    }>;
    systemHealth: {
        activeOPDs: number;
        activeInspektorat: number;
        pendingReviews: number;
        overdueItems: number;
    };
}

export class SuperAdminDashboardService {
    /**
     * Get comprehensive dashboard for Super Admin
     */
    static async getDashboard(): Promise<SuperAdminDashboard> {
        const [overview, opdPerformance, inspektoratPerformance, systemHealth] = await Promise.all([
            this.getOverview(),
            this.getOPDPerformance(),
            this.getInspektoratPerformance(),
            this.getSystemHealth()
        ]);

        return {
            overview,
            opdPerformance,
            inspektoratPerformance,
            systemHealth
        };
    }

    /**
     * Get system overview statistics
     */
    private static async getOverview() {
        // Total reports
        const reportsResult = await query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM reports'
        );
        const totalReports = reportsResult.rows[0]?.count || 0;

        // Total matrix reports
        const matrixResult = await query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM matrix_reports'
        );
        const totalMatrix = matrixResult.rows[0]?.count || 0;

        // Total OPDs (unique institutions)
        const opdResult = await query<RowDataPacket[]>(
            `SELECT COUNT(DISTINCT institution) as count 
       FROM users 
       WHERE role = 'opd' AND institution IS NOT NULL`
        );
        const totalOPDs = opdResult.rows[0]?.count || 0;

        // Total Inspektorat
        const inspektoratResult = await query<RowDataPacket[]>(
            `SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'inspektorat'`
        );
        const totalInspektorat = inspektoratResult.rows[0]?.count || 0;

        // Total recommendations from old system
        const recommendationsResult = await query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM followup_item_recommendations'
        );
        const totalRecommendations = recommendationsResult.rows[0]?.count || 0;

        // Total matrix items
        const matrixItemsResult = await query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM matrix_items'
        );
        const totalMatrixItems = matrixItemsResult.rows[0]?.count || 0;

        // Overall completion rate (combining both systems)
        const oldSystemApproved = await query<RowDataPacket[]>(
            `SELECT COUNT(*) as count 
       FROM followup_item_recommendations 
       WHERE status = 'approved'`
        );
        const oldApproved = oldSystemApproved.rows[0]?.count || 0;

        const matrixApproved = await query<RowDataPacket[]>(
            `SELECT COUNT(*) as count 
       FROM matrix_items 
       WHERE status = 'approved'`
        );
        const matrixApprovedCount = matrixApproved.rows[0]?.count || 0;

        const totalItems = totalRecommendations + totalMatrixItems;
        const totalApproved = oldApproved + matrixApprovedCount;
        const overallCompletionRate = totalItems > 0
            ? Math.round((totalApproved / totalItems) * 100)
            : 0;

        return {
            totalReports,
            totalMatrix,
            totalOPDs,
            totalInspektorat,
            totalRecommendations,
            totalMatrixItems,
            overallCompletionRate
        };
    }

    /**
     * Get OPD performance ranking
     */
    private static async getOPDPerformance() {
        const allStats = await OPDStatisticsService.getAllOPDStatistics();

        return allStats.map((stat, index) => ({
            institution: stat.institution,
            opdName: stat.institution, // Can be enhanced with actual OPD name
            totalRecommendations: stat.recommendationProgress.totalRecommendations,
            approvedRecommendations: stat.recommendationProgress.approvedRecommendations,
            completionRate: stat.completionRate,
            rank: index + 1,
            lastActivity: stat.lastActivity
        }));
    }

    /**
     * Get Inspektorat performance metrics
     */
    private static async getInspektoratPerformance() {
        const performanceData = await query<RowDataPacket[]>(`
      SELECT 
        u.name as inspektorat_name,
        u.id as inspektorat_id,
        COUNT(DISTINCT mr.id) as total_matrix_uploaded,
        COUNT(DISTINCT r.id) as total_reports_assigned,
        SUM(CASE WHEN mi.reviewed_by = u.id THEN 1 ELSE 0 END) as total_reviews_done,
        COALESCE(
          AVG(CASE 
            WHEN mi.reviewed_by = u.id AND mi.reviewed_at IS NOT NULL AND mi.updated_at IS NOT NULL
            THEN TIMESTAMPDIFF(HOUR, mi.updated_at, mi.reviewed_at)
            ELSE NULL
          END),
          0
        ) as avg_review_time_hours
      FROM users u
      LEFT JOIN matrix_reports mr ON mr.uploaded_by = u.id
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = mr.id
      LEFT JOIN reports r ON r.assigned_to = u.id
      WHERE u.role = 'inspektorat'
      GROUP BY u.id, u.name
      ORDER BY total_reviews_done DESC, u.name
    `);

        return performanceData.rows.map(row => ({
            inspektoratName: row.inspektorat_name,
            totalMatrixUploaded: parseInt(row.total_matrix_uploaded) || 0,
            totalReviewsDone: parseInt(row.total_reviews_done) || 0,
            avgReviewTime: parseFloat(row.avg_review_time_hours) || 0,
            totalReportsAssigned: parseInt(row.total_reports_assigned) || 0
        }));
    }

    /**
     * Get system health indicators
     */
    private static async getSystemHealth() {
        // Active OPDs (OPDs with at least one activity in last 30 days)
        const activeOPDsResult = await query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT u.institution) as count
      FROM users u
      LEFT JOIN matrix_assignments ma ON ma.assigned_to = u.id
      LEFT JOIN matrix_items mi ON mi.matrix_report_id = ma.matrix_report_id
      WHERE u.role = 'opd' 
        AND u.institution IS NOT NULL
        AND (mi.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR ma.last_activity_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
    `);
        const activeOPDs = activeOPDsResult.rows[0]?.count || 0;

        // Active Inspektorat (Inspektorat with at least one activity in last 30 days)
        const activeInspektoratResult = await query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN matrix_reports mr ON mr.uploaded_by = u.id
      LEFT JOIN matrix_items mi ON mi.reviewed_by = u.id
      WHERE u.role = 'inspektorat'
        AND (mr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR mi.reviewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
    `);
        const activeInspektorat = activeInspektoratResult.rows[0]?.count || 0;

        // Pending reviews (items submitted but not reviewed)
        const pendingReviewsResult = await query<RowDataPacket[]>(`
      SELECT COUNT(*) as count
      FROM matrix_items
      WHERE status = 'submitted'
    `);
        const pendingReviews = pendingReviewsResult.rows[0]?.count || 0;

        // Overdue items (assignments past due date with incomplete items)
        const overdueItemsResult = await query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT ma.id) as count
      FROM matrix_assignments ma
      JOIN matrix_reports mr ON ma.matrix_report_id = mr.id
      WHERE ma.status NOT IN ('completed', 'approved')
        AND mr.due_date IS NOT NULL
        AND mr.due_date < NOW()
    `);
        const overdueItems = overdueItemsResult.rows[0]?.count || 0;

        return {
            activeOPDs,
            activeInspektorat,
            pendingReviews,
            overdueItems
        };
    }

    /**
     * Get monthly trend data for charts
     */
    static async getMonthlyTrend(months: number = 6) {
        const trendData = await query<RowDataPacket[]>(`
      SELECT 
        DATE_FORMAT(mi.updated_at, '%Y-%m') as month,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN mi.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN mi.status = 'submitted' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN mi.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM matrix_items mi
      WHERE mi.updated_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        AND mi.status IN ('submitted', 'approved', 'rejected')
      GROUP BY DATE_FORMAT(mi.updated_at, '%Y-%m')
      ORDER BY month ASC
    `, [months]);

        return trendData.rows;
    }

    /**
     * Get top performing OPDs (top 5)
     */
    static async getTopPerformingOPDs(limit: number = 5) {
        const ranking = await OPDStatisticsService.getOPDRanking();
        return ranking.slice(0, limit);
    }

    /**
     * Get recent activities across the system
     */
    static async getRecentActivities(limit: number = 10) {
        const activities = await query<RowDataPacket[]>(`
      SELECT 
        'matrix_submission' as activity_type,
        u.name as user_name,
        u.institution,
        mi.temuan as description,
        mi.updated_at as activity_date
      FROM matrix_items mi
      JOIN matrix_reports mr ON mi.matrix_report_id = mr.id
      JOIN matrix_assignments ma ON ma.matrix_report_id = mr.id
      JOIN users u ON ma.assigned_to = u.id
      WHERE mi.status IN ('submitted', 'approved')
      
      UNION ALL
      
      SELECT 
        'matrix_review' as activity_type,
        u.name as user_name,
        'Inspektorat' as institution,
        CONCAT('Review: ', mi.temuan) as description,
        mi.reviewed_at as activity_date
      FROM matrix_items mi
      JOIN users u ON mi.reviewed_by = u.id
      WHERE mi.reviewed_at IS NOT NULL
      
      ORDER BY activity_date DESC
      LIMIT ?
    `, [limit]);

        return activities.rows;
    }
}
