import { ReportModel } from '../models/report.model';
import { FollowupItemModel } from '../models/followup-item.model';
import { FollowupRecommendationModel } from '../models/followup-recommendation.model';

export interface OPDStatistics {
  institution: string;
  totalReports: number;
  reportsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
    needs_revision: number;
  };
  followupProgress: {
    totalFollowupItems: number;
    completedFollowupItems: number;
    pendingFollowupItems: number;
    approvedFollowupItems: number;
  };
  recommendationProgress: {
    totalRecommendations: number;
    submittedRecommendations: number;
    approvedRecommendations: number;
    rejectedRecommendations: number;
  };
  completionRate: number;
  lastActivity: Date | null;
}

export const OPDStatisticsService = {
  async getOPDStatistics(institution: string): Promise<OPDStatistics> {
    // Get all reports for this institution
    const reports = await ReportModel.findAll({ institution });
    
    // Calculate report statistics
    const reportsByStatus = {
      pending: reports.filter(r => r.status === 'pending').length,
      approved: reports.filter(r => r.status === 'approved').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
      needs_revision: reports.filter(r => r.status === 'needs_revision').length,
    };

    // Initialize counters
    let totalFollowupItems = 0;
    let completedFollowupItems = 0;
    let pendingFollowupItems = 0;
    let approvedFollowupItems = 0;
    let totalRecommendations = 0;
    let submittedRecommendations = 0;
    let approvedRecommendations = 0;
    let rejectedRecommendations = 0;
    let lastActivity: Date | null = null;

    // Get report IDs for batch queries
    const reportIds = reports.map(r => r.id);
    
    if (reportIds.length > 0) {
      // Batch query for all followup items
      const allFollowupItems = await FollowupItemModel.getByReportIds(reportIds);
      totalFollowupItems = allFollowupItems.length;
      
      // Process followup items
      for (const item of allFollowupItems) {
        if (item.status === 'completed') completedFollowupItems++;
        if (item.status === 'pending') pendingFollowupItems++;
        if (item.status === 'approved') approvedFollowupItems++;
        
        // Update last activity
        if (!lastActivity || new Date(item.updated_at) > lastActivity) {
          lastActivity = new Date(item.updated_at);
        }
      }
      
      // Get followup item IDs for batch query
      const followupItemIds = allFollowupItems.map(item => item.id);
      
      if (followupItemIds.length > 0) {
        // Batch query for all recommendations
        const allRecommendations = await FollowupRecommendationModel.getByFollowupItemIds(followupItemIds);
        totalRecommendations = allRecommendations.length;
        
        // Process recommendations
        for (const rec of allRecommendations) {
          if (rec.status === 'submitted') submittedRecommendations++;
          if (rec.status === 'approved') approvedRecommendations++;
          if (rec.status === 'rejected') rejectedRecommendations++;
          
          // Update last activity
          if (!lastActivity || new Date(rec.updated_at) > lastActivity) {
            lastActivity = new Date(rec.updated_at);
          }
        }
      }
    }

    // Calculate completion rate
    const completionRate = totalRecommendations > 0 
      ? Math.round((approvedRecommendations / totalRecommendations) * 100)
      : 0;

    return {
      institution,
      totalReports: reports.length,
      reportsByStatus,
      followupProgress: {
        totalFollowupItems,
        completedFollowupItems,
        pendingFollowupItems,
        approvedFollowupItems,
      },
      recommendationProgress: {
        totalRecommendations,
        submittedRecommendations,
        approvedRecommendations,
        rejectedRecommendations,
      },
      completionRate,
      lastActivity,
    };
  },

  async getAllOPDStatistics(): Promise<OPDStatistics[]> {
    // Get all institutions
    const institutions = await ReportModel.getInstitutions();
    
    // Get statistics for each institution
    const statistics = await Promise.all(
      institutions.map(institution => this.getOPDStatistics(institution))
    );

    // Sort by completion rate descending
    return statistics.sort((a, b) => b.completionRate - a.completionRate);
  },

  async getOPDRanking(): Promise<Array<{
    institution: string;
    completionRate: number;
    totalRecommendations: number;
    approvedRecommendations: number;
    rank: number;
  }>> {
    const allStats = await this.getAllOPDStatistics();
    
    return allStats.map((stat, index) => ({
      institution: stat.institution,
      completionRate: stat.completionRate,
      totalRecommendations: stat.recommendationProgress.totalRecommendations,
      approvedRecommendations: stat.recommendationProgress.approvedRecommendations,
      rank: index + 1,
    }));
  }
};