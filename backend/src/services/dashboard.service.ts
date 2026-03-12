import { ReportModel, ReportFilters } from '../models/report.model';
import { Report, ReportStatus } from '../types';

export interface AdminDashboard {
  statistics: {
    total: number;
    pending: number;
    in_progress: number;
    approved: number;
    rejected: number;
  };
  recentReports: Report[];
}

export interface UserDashboard {
  assignedReports: Report[];
  statistics: {
    total: number;
    pending: number;
    in_progress: number;
    approved: number;
    rejected: number;
  };
}

export const DashboardService = {
  async getAdminDashboard(filters?: ReportFilters): Promise<AdminDashboard> {
    const statistics = await ReportModel.getStatistics();
    const recentReports = await ReportModel.findAll(filters);

    return {
      statistics,
      recentReports: recentReports.slice(0, 10), // Last 10 reports
    };
  },

  async getUserDashboard(userId: string, filters?: ReportFilters): Promise<UserDashboard> {
    // Get reports assigned to user with additional filters
    const userFilters: ReportFilters = { ...filters, assignedUserId: userId };
    const assignedReports = await ReportModel.findAll(userFilters);

    // Calculate user-specific statistics (without filters for accurate counts)
    const allUserReports = await ReportModel.findAll({ assignedUserId: userId });
    const statistics = {
      total: allUserReports.length,
      pending: allUserReports.filter((r) => r.status === 'pending').length,
      in_progress: allUserReports.filter((r) => r.status === 'in_progress').length,
      approved: allUserReports.filter((r) => r.status === 'approved').length,
      rejected: allUserReports.filter((r) => r.status === 'rejected').length,
    };

    return {
      assignedReports,
      statistics,
    };
  },

  async getReportsByStatus(status: ReportStatus, userId?: string): Promise<Report[]> {
    const filters: ReportFilters = { status };
    if (userId) {
      filters.assignedUserId = userId;
    }
    return ReportModel.findAll(filters);
  },

  async getInspektoratAnalytics(userId: string) {
    try {
      // FIXED: Inspektorat melihat SEMUA laporan dari SEMUA OPD, bukan hanya yang di-assign
      // Get ALL reports in the system (inspektorat monitors all OPD performance)
      const allReports = await ReportModel.findAll({});

      // Calculate statistics from ALL reports
      const totalReports = allReports.length;
      const pendingReports = allReports.filter(r => r.status === 'pending').length;
      const approvedReports = allReports.filter(r => r.status === 'approved').length;
      const rejectedReports = allReports.filter(r => r.status === 'rejected').length;
      const needsRevisionReports = allReports.filter(r => r.status === 'needs_revision').length;

      // Get unique OPDs that have submitted reports
      const opdInstitutions = new Set(allReports.map(r => r.creator_institution).filter(Boolean));
      const totalOPDs = 8; // Total OPDs in system (hardcoded for now)
      const activeOPDs = opdInstitutions.size;

      // Calculate monthly reports (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyReports = allReports.filter(r => {
        const reportDate = new Date(r.created_at);
        return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
      }).length;

      // Calculate average response time (mock calculation)
      const completedReports = allReports.filter(r => r.status === 'approved' || r.status === 'rejected');
      const avgResponseTime = completedReports.length > 0 ? 2.5 : 0; // Mock: 2.5 days average

      return {
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        needsRevisionReports,
        totalOPDs,
        activeOPDs,
        monthlyReports,
        avgResponseTime
      };
    } catch (error) {
      console.error('Error getting inspektorat analytics:', error);
      throw error;
    }
  },
};