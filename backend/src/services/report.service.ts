import { ReportModel, ReportFilters } from '../models/report.model';
import { EmailService } from './email.service';
import { UserModel } from '../models/user.model';
import { Report, CreateReportDTO, ReportStatus } from '../types';

export const ReportService = {
  async createReport(data: CreateReportDTO): Promise<Report> {
    const report = await ReportModel.create(
      data.title,
      data.description,
      data.createdBy,
      data.assignedUserId
    );

    // Send email notification to assigned user
    try {
      const assignedUser = await UserModel.findById(data.assignedUserId);
      if (assignedUser) {
        await EmailService.sendReportNotification(assignedUser, report);
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to send email notification:', error);
    }

    return report;
  },

  // User creates report (assigned to admin for review)
  async createUserReport(data: { title: string; description: string; createdBy: string }): Promise<Report> {
    // Find an admin to assign the report to
    const admins = await UserModel.findByRole('super_admin');
    const adminId = admins.length > 0 ? admins[0].id : data.createdBy;

    const report = await ReportModel.create(
      data.title,
      data.description,
      data.createdBy,
      adminId // Assign to admin for review
    );

    return report;
  },

  async getReports(filters?: ReportFilters): Promise<Report[]> {
    return ReportModel.findAll(filters);
  },

  async searchReports(searchTerm: string, status?: ReportStatus): Promise<Report[]> {
    return ReportModel.findAll({ search: searchTerm, status });
  },

  async getReportById(id: string): Promise<Report | null> {
    return ReportModel.findById(id);
  },

  async getReportsByUser(userId: string): Promise<Report[]> {
    return ReportModel.findByAssignedUser(userId);
  },

  // Get reports created by user
  async getReportsCreatedByUser(userId: string): Promise<Report[]> {
    return ReportModel.findAll({ createdBy: userId });
  },

  async getStatistics() {
    return ReportModel.getStatistics();
  },

  async getPendingReports(): Promise<Report[]> {
    return ReportModel.findAll({ status: 'pending' });
  },

  async approveReport(reportId: string): Promise<Report | null> {
    return ReportModel.updateStatus(reportId, 'approved');
  },

  async rejectReport(reportId: string, notes?: string): Promise<Report | null> {
    return ReportModel.updateStatus(reportId, 'rejected', notes);
  },

  async resubmitReport(reportId: string): Promise<Report | null> {
    // Reset status to pending and clear rejection notes
    return ReportModel.resubmit(reportId);
  },

  async updateRecommendation(reportId: string, recommendation: string): Promise<Report | null> {
    return ReportModel.updateRecommendation(reportId, recommendation);
  },
};
